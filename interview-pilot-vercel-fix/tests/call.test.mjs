import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function app(){
  const nodes=new Map();const sent=[];
  const node=s=>{if(!nodes.has(s))nodes.set(s,{value:'',hidden:false,disabled:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},scrollHeight:0,scrollTop:0,clientHeight:0,close(){},pause(){},remove(){}});return nodes.get(s);};
  const context={document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){}},window:{scrollTo(){},addEventListener(){}},navigator:{},performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},setInterval:()=>1,clearInterval(){},fetch:async()=>({ok:true,json:async()=>({configured:false})}),console,AbortController,AbortSignal};
  vm.createContext(context);for(const file of ['app.js','realtime.js'])vm.runInContext(readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),context);
  context.sent=sent;return{node,sent,run:code=>vm.runInContext(code,context)};
}
test('audio transcripts accumulate without an answer submission',()=>{
  const {run,node}=app();
  run("call.connected=true;active=true;handleCallEvent({type:'input_audio_buffer.speech_started',item_id:'u1'});handleCallEvent({type:'conversation.item.input_audio_transcription.delta',item_id:'u1',delta:'My '});handleCallEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'u1',transcript:'My answer.'});");
  assert.equal(run('call.transcript.length'),1);assert.equal(run('call.transcript[0].text'),'My answer.');assert.equal(run('call.transcript[0].partial'),false);
  assert.match(node('#live-transcript').innerHTML,/My answer/);
});
test('private observations do not appear in live transcript; tools use the same coding workspace',()=>{
  const {run,node,sent}=app();run("call.connected=true;call.channel={readyState:'open',send:e=>sent.push(JSON.parse(e))};config.format='coding';");
  run(`handleCallEvent({type:'response.function_call_arguments.done',name:'record_observation',call_id:'n1',arguments:JSON.stringify({quote:'Evidence',issue:'Explain the assumption',practice:'State the assumption first'})});`);
  assert.equal(run('call.notes.length'),1);assert.equal(run('call.transcript.length'),0);
  run("handleCallEvent({type:'response.function_call_arguments.done',name:'open_coding_workspace',call_id:'c1',arguments:'{}'});");assert.equal(node('#coding-workspace').hidden,false);assert.equal(sent.length,2);
});
test('pause mutes audio, disables the microphone and suppresses automatic responses',()=>{
  const {run,sent}=app();run("active=true;config.duration=15;call.connected=true;call.channel={readyState:'open',send:e=>sent.push(JSON.parse(e))};const track={enabled:true};micStream={getAudioTracks:()=>[track]};call.audio={muted:false};$('#pause-interview').onclick();");
  assert.equal(run('paused'),true);assert.equal(run('track.enabled'),false);assert.equal(run('call.audio.muted'),true);assert.equal(sent[0].session.audio.input.turn_detection,null);
  run("$('#pause-interview').onclick()");assert.equal(run('track.enabled'),true);assert.equal(sent.at(-1).session.audio.input.turn_detection.type,'semantic_vad');
});
test('captions escape HTML and missing credentials never start a fake interview',async()=>{
  const {run,node}=app();run("upsertTurn('x','user','<img src=x onerror=alert(1)>')");assert(!node('#live-transcript').innerHTML.includes('<img'));
  run("Object.assign(config,{company:'Example',role:'Analyst',jd:'JD',track:'quant',stage:'First round',format:'full',duration:15});");await run('joinCall()');assert.equal(run('active'),false);assert.equal(run('call.connected'),false);
});
