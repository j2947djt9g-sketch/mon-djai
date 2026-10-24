/* Offline shell scoped to Clair only; financial data is not cached. */
const BASE=new URL('./',self.location.href);
const CACHE='clair-github-'+BASE.pathname+'v35';
const ASSETS=['assets/mascotte/01-bienvenue.png','assets/mascotte/02-serenite.png','assets/mascotte/03-vigilance.png','assets/mascotte/04-prevision-tendue.png','assets/mascotte/05-solde-zero.png','assets/mascotte/06-solde-negatif-v2.webp','index.html','manifest.webmanifest','icons/icon.svg','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'].map(p=>new URL(p,BASE).href);
const HOME=new URL('index.html',BASE).href;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('clair-github-'+BASE.pathname)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==BASE.origin)return;
 const isHome=u.pathname===BASE.pathname||u.pathname===new URL(HOME).pathname;
 if(!isHome&&!ASSETS.includes(u.href))return;
 if(isHome)e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(HOME,copy)));}return r}).catch(()=>caches.open(CACHE).then(c=>c.match(HOME))));
 else e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
});
self.addEventListener('push',e=>{
 let p={};try{p=e.data?e.data.json():{}}catch{}
 e.waitUntil(self.registration.showNotification(String(p.title||'Clair — échéance').slice(0,120),{body:String(p.body||'').slice(0,300),tag:String(p.tag||'clair-reminder').slice(0,200),icon:new URL('icons/icon-192.png',BASE).href,data:{url:HOME}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
 for(const c of list)if(c.url.startsWith(BASE.href)&&'focus'in c){c.navigate?.(HOME);return c.focus()}return self.clients.openWindow(HOME);
 }));
});

