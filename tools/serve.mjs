// Enkel lokal server som ligner Netlify: /sti -> /sti/index.html, img fra repoet, 302 for /medvirkende
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [,, ROOT, IMG, PORT="8080"] = process.argv;
const types = {".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".woff2":"font/woff2",".jpg":"image/jpeg",".png":"image/png",".xml":"application/xml",".txt":"text/plain"};
const toml = fs.readFileSync(path.join(ROOT,"netlify.toml"),"utf8");
const redirs = [...toml.matchAll(/from = "([^"]+)"\n  to = "([^"]+)"\n  status = (\d+)/g)].map(m=>[m[1],m[2],+m[3]]);
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  const tryF = [];
  if(p.startsWith("/img/") || p==="/favicon.png" || p==="/apple-touch-icon.png") tryF.push(path.join(p.startsWith("/img/")?IMG:path.join(IMG,".."), p.replace(/^\/img\//,"")));
  tryF.push(path.join(ROOT,p), path.join(ROOT,p,"index.html"));
  const f = tryF.find(x=>fs.existsSync(x) && fs.statSync(x).isFile());
  if(f){ res.writeHead(200,{"content-type":types[path.extname(f)]||"application/octet-stream"}); return fs.createReadStream(f).pipe(res); }
  for(const [from,to,st] of redirs){
    const q = p.replace(/\/$/,"") || "/";
    if(from.endsWith("/*") ? q.startsWith(from.slice(0,-1)) : q===from){ res.writeHead(st,{location:to}); return res.end(); }
  }
  res.writeHead(404,{"content-type":"text/html; charset=utf-8"}); fs.createReadStream(path.join(ROOT,"404.html")).pipe(res);
}).listen(+PORT, ()=>console.log("http://localhost:"+PORT));
