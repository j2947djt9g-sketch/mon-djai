const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../sw.js','utf8'),origin='https://example.test',base=origin+'/mon-djai/clair/',home=base+'index.html';
function setup(){
 const handlers={},cache=new Map(),opened=[],deleted=[],network=[],pending=[];let offline=false,skip=0,claim=0;
 const response=tag=>({tag,ok:true,clone(){return response(tag)}});
 const stored=response('cached');cache.set(home,stored);
 const box={match:async request=>cache.get(typeof request==='string'?request:request.url),put:async(key,value)=>cache.set(key,value),addAll:async urls=>{for(const url of urls)cache.set(url,response('precache'))}};
 const sandbox={URL,Promise,self:{location:{href:base+'sw.js'},addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:async()=>skip++,clients:{claim:async()=>claim++}},
 caches:{open:async key=>{opened.push(key);return box},keys:async()=>['clair-github-/mon-djai/clair/v12','clair-github-/mon-djai/clair/v13','clair-github-/mon-djai/clair/v14','clair-github-/mon-djai/clair/v15','clair-github-/mon-djai/clair/v16','clair-github-/mon-djai/clair/v17','clair-github-/mon-djai/clair/v18','clair-github-/mon-djai/clair/v19','clair-github-/mon-djai/clair/v20','other-app-cache'],delete:async key=>deleted.push(key)},
 fetch:async(request,options)=>{network.push({request,options});if(offline)throw Error('offline');return response('network')}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {handlers,opened,deleted,network,cache,stored,offline(value){offline=value},async dispatch(url,method='GET'){let result;handlers.fetch({request:{url,method},respondWith(p){result=p},waitUntil(p){pending.push(p)}});const value=await result;await Promise.all(pending.splice(0));return value},async event(type){handlers[type]({waitUntil(p){pending.push(p)}});await Promise.all(pending.splice(0));},skip:()=>skip,claim:()=>claim};
}
(async()=>{
 const a=setup();a.offline(true);
 for(const url of [base,base+'?source=test',home,home+'?version=20261016',home+'#section'])assert.equal(await a.dispatch(url),a.stored);
 assert(a.opened.every(key=>key==='clair-github-/mon-djai/clair/v31'));
 assert.equal(await a.dispatch(origin+'/another-app/'),undefined);assert.equal(await a.dispatch('https://other.test/mon-djai/clair/'),undefined);assert.equal(await a.dispatch(home,'POST'),undefined);
 const b=setup();assert.equal((await b.dispatch(base+'?version=new')).tag,'network');assert.equal(b.network[0].options.cache,'no-cache');assert.equal(b.cache.get(home).tag,'network');b.offline(true);assert.equal((await b.dispatch(base+'?version=new')).tag,'network');
 const c=setup();await c.event('install');assert.equal(c.skip(),1);assert(c.cache.has(base+'icons/icon-maskable-512.png'));assert(!c.cache.has(base+'assets/mascotte-poses.png'));assert(!c.cache.has(base+'assets/mascotte/01-bienvenue.webp'));for(const name of ['01-bienvenue.png','02-serenite.png','03-vigilance.png','04-prevision-tendue.png','05-solde-zero.png','06-solde-negatif-v2.webp'])assert(c.cache.has(base+'assets/mascotte/'+name));await c.event('activate');assert.deepEqual(c.deleted,['clair-github-/mon-djai/clair/v12','clair-github-/mon-djai/clair/v13','clair-github-/mon-djai/clair/v14','clair-github-/mon-djai/clair/v15','clair-github-/mon-djai/clair/v16','clair-github-/mon-djai/clair/v17','clair-github-/mon-djai/clair/v18','clair-github-/mon-djai/clair/v19','clair-github-/mon-djai/clair/v20']);assert.equal(c.claim(),1);
 console.log('PASS offline home/query links, canonical cache, network revalidation, seven visuals, scoped activation and no interception of foreign routes or writes');
})().catch(error=>{console.error(error);process.exitCode=1});

