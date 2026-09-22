import handler from '../lib/handler.mjs';
export default function endpoint(req,res){
  req.url='/api/report';
  return handler(req,res);
}
