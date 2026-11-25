import fs from 'node:fs';import http from 'node:http';import dgram from 'node:dgram';import {fileURLToPath} from 'node:url';import path from 'node:path';import {validateEvent,ident} from './objects.mjs';
export async function startBridge(session,{udpPort=session.udp_port,httpPort=session.http_port,journalPath=null}={}){
 if(!ident(session.mission)||!ident(session.session)||!/^[a-f0-9]{64}$/.test(session.token)||!Array.isArray(session.objects))throw Error('Session invalide');
 const events=[],seen=new Set();let cursor=0,rejected=0;
 if(journalPath&&fs.existsSync(journalPath)){
  if(fs.statSync(journalPath).size>20e6)throw Error('Journal trop volumineux');
  for(const line of fs.readFileSync(journalPath,'utf8').split('\n').filter(Boolean)){
   const old=JSON.parse(line);const safe=validateEvent(session,{...old,token:session.token});
   const key=safe.run+':'+safe.seq;if(seen.has(key))continue;if(seen.size>=20000)throw Error('Journal saturé');
   seen.add(key);events.push({...safe,cursor:++cursor});if(events.length>1000)events.shift();
  }
 }
 const udp=dgram.createSocket('udp4');
 udp.on('message',(bytes,peer)=>{
  if(peer.address!=='127.0.0.1'||bytes.length>4096)return;
  try{
   const incoming=JSON.parse(bytes),safe=validateEvent(session,incoming),key=safe.run+':'+safe.seq;
   if(!seen.has(key)){
    if(seen.size>=20000)throw Error('Session saturée, régénérer le paquet');
    const entry={...safe,cursor:cursor+1,received_at:new Date().toISOString()};
    if(journalPath)fs.appendFileSync(journalPath,JSON.stringify(entry)+'\n',{flush:true});
    seen.add(key);cursor++;events.push(entry);if(events.length>1000)events.shift();
   }
   udp.send(`ACK ${session.session} ${safe.run} ${safe.seq}`,peer.port,peer.address);
  }catch{rejected++;}
 });
 const origins=new Set(['http://127.0.0.1:8000','http://localhost:8000','http://127.0.0.1:8787','http://localhost:8787']);
 const server=http.createServer((req,res)=>{
  const host=req.headers.host||'';if(!/^127\.0\.0\.1:\d+$/.test(host)&&!/^localhost:\d+$/.test(host)){res.writeHead(403);return res.end();}
  const origin=req.headers.origin;if(origin&&!origins.has(origin)&&origin!==`http://${host}`){res.writeHead(403);return res.end();}
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})};
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);return res.end();}
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/events'){
   const after=Number(u.searchParams.get('after')||0);if(!Number.isInteger(after)||after<0){res.writeHead(400,headers);return res.end();}
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8',...headers});return res.end(JSON.stringify({protocol:1,session:session.session,mission:session.mission,cursor,gap:events.length>0&&after<events[0].cursor-1,rejected,events:events.filter(e=>e.cursor>after)}));
  }
  if(u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',...headers});return res.end(fs.readFileSync(new URL('./monitor.html',import.meta.url)));}
  res.writeHead(404,headers);res.end();
 });
 try{await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(udpPort,'127.0.0.1',resolve);});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(httpPort,'127.0.0.1',resolve);});}catch(e){udp.close();server.close();throw e;}
 return {udpPort:udp.address().port,httpPort:server.address().port,events,close:()=>Promise.all([new Promise(r=>udp.close(r)),new Promise(r=>server.close(r))])};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const file=process.argv[2],s=JSON.parse(fs.readFileSync(file,'utf8'));const bridge=await startBridge(s,{journalPath:path.join(path.dirname(file),'events-local.ndjson')});console.log(`Pont local ${s.mission} : http://127.0.0.1:${bridge.httpPort}/ — UDP ${bridge.udpPort}`);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await bridge.close();process.exit(1);});}catch(e){console.error(e.message);process.exit(1);}
}
