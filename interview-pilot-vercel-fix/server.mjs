import http from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './lib/handler.mjs';
export { validateConfig, sessionConfig } from './lib/handler.mjs';
export default handler;
export const server=http.createServer(handler);
const port=Number(process.env.PORT||5173);
if(!process.env.VERCEL&&process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  server.listen(port,'127.0.0.1',()=>console.log(`InterviewPilot: http://127.0.0.1:${port}`));
}
