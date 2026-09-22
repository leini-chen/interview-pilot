import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { server, sessionConfig, validateConfig } from '../server.mjs';
import statusEndpoint from '../api/status.js';
import sessionEndpoint from '../api/session.js';

const config={company:'Example',role:'Analyst',jd:'Research and code in Python.',track:'quant',format:'full',stage:'Technical round',duration:15,interviewer:'Public team biography'};
function request(path,{method='GET',body,headers={}}={}) {
  return new Promise(resolve=>{
    const req=Readable.from(body?[JSON.stringify(body)]:[]);
    Object.assign(req,{url:path,method,headers:{host:'127.0.0.1:5173','content-type':'application/json',...headers}});
    const res={status:0,headers:{},writeHead(status,headers){this.status=status;this.headers=headers;},end(body){resolve({status:this.status,headers:this.headers,text:body?.toString()||''});}};
    server.emit('request',req,res);
  });
}
test('call instructions include role context, English, voice turn detection and private notes',()=>{
  const c=sessionConfig(validateConfig(config));
  assert.equal(c.audio.input.turn_detection.type,'semantic_vad');
  assert.equal(c.audio.input.turn_detection.interrupt_response,true);
  assert.equal(c.audio.input.transcription.language,'en');
  assert.match(c.instructions,/Research and code in Python/);
  assert.match(c.instructions,/NO VIDEO/);
  assert(c.tools.some(t=>t.name==='record_observation'));
  assert.throws(()=>validateConfig({...config,duration:121}));
});
test('private files and cross-origin API calls are inaccessible',async()=>{
  assert.equal((await request('/.env')).status,404);
  assert.equal((await request('/server.mjs')).status,404);
  assert.equal((await request('/api/status',{headers:{origin:'https://unrelated.example'}})).status,403);
  assert.equal((await request('/api/status',{headers:{host:'unrelated.example:5173'}})).status,403);
  const status=await request('/api/status');
  assert.equal(status.status,200);
  assert.equal(JSON.parse(status.text).language,'en');
  assert.equal('key' in JSON.parse(status.text),false);
});
test('SDP proxy keeps session configuration on the server and reports upstream failures',async()=>{
  const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key-never-sent';
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'https://api.openai.com/v1/realtime/calls');
      assert.equal(options.body.get('sdp'),'v=0\r\ns=test');
      assert.equal(JSON.parse(options.body.get('session')).audio.input.transcription.language,'en');
      return new Response('v=0\r\ns=answer',{status:201});
    };
    const result=await request('/api/session',{method:'POST',body:{config,sdp:'v=0\r\ns=test'}});
    assert.equal(result.status,200);assert.equal(JSON.parse(result.text).sdp,'v=0\r\ns=answer');
    globalThis.fetch=async()=>new Response('{}',{status:401});
    const failed=await request('/api/session',{method:'POST',body:{config,sdp:'v=0\r\ns=test'}});
    assert.match(JSON.parse(failed.text).error,/key was rejected/);
    assert(!failed.text.includes('test-key-never-sent'));
  }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});
test('feedback is based on transcript and does not request video analysis',async()=>{
  const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key-never-sent';
  const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);
      assert.equal(body.store,false);assert.match(body.instructions,/Do not invent scores/);
      assert.match(body.input,/My answer/);
      return Response.json({output:[{content:[{type:'output_text',text:'Evidence-based practice feedback.'}]}]});
    };
    const result=await request('/api/report',{method:'POST',body:{config,transcript:[{role:'user',text:'My answer',seconds:12}]}});
    assert.equal(JSON.parse(result.text).report,'Evidence-based practice feedback.');
  }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});

test('Vercel adapters accept HTTPS deployment hosts and pre-parsed JSON without reading local secrets',async()=>{
  const names=['VERCEL','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_BRANCH_URL','APP_ORIGIN','OPENAI_API_KEY'];
  const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));const oldFetch=globalThis.fetch;
  Object.assign(process.env,{VERCEL:'1',VERCEL_URL:'preview.example.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'interview.example.vercel.app'});
  delete process.env.OPENAI_API_KEY;delete process.env.APP_ORIGIN;
  const invoke=(endpoint,body,host='preview.example.vercel.app',origin=`https://${host}`)=>new Promise(resolve=>{
    const req={method:body?'POST':'GET',url:'/',body,headers:{host,origin,'content-type':'application/json'}};
    const res={status:0,writeHead(s){this.status=s;},end(value){resolve({status:this.status,body:JSON.parse(value)})}};
    endpoint(req,res);
  });
  try{
    const empty=await invoke(statusEndpoint);assert.equal(empty.status,200);assert.equal(empty.body.configured,false);
    assert.equal((await invoke(statusEndpoint,null,'attacker.example')).status,403);
    assert.equal((await invoke(statusEndpoint,null,'preview.example.vercel.app','https://attacker.example')).status,403);
    process.env.OPENAI_API_KEY='test-key-never-sent';
    globalThis.fetch=async()=>new Response('v=0\r\ns=answer',{status:201});
    const call=await invoke(sessionEndpoint,{config,sdp:'v=0\r\ns=offer'});assert.equal(call.status,200);assert.equal(call.body.sdp,'v=0\r\ns=answer');
    const prod=await invoke(statusEndpoint,null,'interview.example.vercel.app');assert.equal(prod.status,200);
    process.env.APP_ORIGIN='https://interview.example.com';assert.equal((await invoke(statusEndpoint,null,'interview.example.com')).status,200);
  }finally{globalThis.fetch=oldFetch;for(const k of names){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});
