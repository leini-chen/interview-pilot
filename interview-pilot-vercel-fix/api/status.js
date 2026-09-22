import handler from '../lib/handler.mjs';
export default function endpoint(req,res){
  req.url='/api/status';
  return handler(req,res);
}
