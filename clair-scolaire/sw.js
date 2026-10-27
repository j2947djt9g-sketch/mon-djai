/* Offline shell: limited to Clair Scolaire path. Network first avoids stale releases. */
const CACHE = "clair-scolaire-shell-v2";
const SHELL = ["./","./index.html","./style.css?v=2.1","./app.js?v=2.1","./icon.svg","./manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("clair-scolaire-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  const scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(req,response.clone()).catch(()=>{});}
      return response;
    }catch(error){
      const cached=await caches.match(req);
      if(cached)return cached;
      if(req.mode==="navigate"){const fallback=await caches.match("./index.html");if(fallback)return fallback;}
      return Response.error();
    }
  })());
});