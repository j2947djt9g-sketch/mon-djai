const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
const source=fs.readFileSync(__dirname+'/cloud.js','utf8'),html=fs.readFileSync(__dirname+'/../index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);scripts.forEach(s=>new vm.Script(s));
const ectx={window:{},Date,Intl};vm.createContext(ectx);vm.runInContext(scripts[0],ectx);const E=ectx.window.ClairEngine;
assert.equal(require('crypto').createHash('sha256').update(scripts[0]).digest('hex'),'d6c1a581119b4d636cf98f3fe20d5823d0f592e48ed9c2856409f34ecb8fa39c');
let rows=new Map(),saveDelay=null,readDelay=null,loseResponse=false;
function device(uid,storage=new Map()){
 let currentUser={id:uid,email:uid+'@example.test',user_metadata:{display_name:uid}};
 const writes=[],applications=[],navigator={onLine:true};let callback;
 const client={auth:{onAuthStateChange:f=>callback=f,getSession:async()=>({data:{session:{user:currentUser}}}),signOut:async()=>({})},
 from:()=>({select(){return this},eq(_field,value){this.uid=value;return this},async maybeSingle(){if(readDelay)await readDelay;return {data:structuredClone(rows.get(this.uid)||null)}}}),
 async rpc(name,params){const id=currentUser.id;if(saveDelay)await saveDelay;const row=rows.get(id);
 if(row?.operation_id===params.p_operation_id)return {data:{saved:true,row:structuredClone(row)}};
 if((row?.revision||0)!==params.p_expected_revision)return {data:{saved:false,row:structuredClone(row||null)}};
 const next={payload:params.p_payload,revision:(row?.revision||0)+1,operation_id:params.p_operation_id,display_name:params.p_display_name};rows.set(id,structuredClone(next));writes.push(params);
 if(loseResponse){loseResponse=false;throw Error('response lost')};return {data:{saved:true,row:structuredClone(next)}};
 }};
 const context={window:{},crypto,structuredClone,JSON,Error,Number,String,Date,navigator,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){}};
 vm.createContext(context);vm.runInContext(source,context);
 const hooks={normalize:d=>E.normalize(d),enter(){},apply:(p,r)=>applications.push({p,r}),status(){},leave(){},empty(){}};
 const cloud=new context.window.ClairCloud({url:'https://testproject.supabase.co',key:'sb_publishable_test'},hooks,{createClient:()=>client});
 return {cloud,storage,writes,applications,navigator,client,localStorage:context.localStorage,authEvent:(event,session)=>callback(event,session),setUser:u=>{currentUser=u},edit:d=>{const raw=cloud.pack(d);storage.set(cloud.key(),raw);cloud.saved(raw)},async init(){await cloud.init()}};
}
const budget=n=>{const d=E.empty();d.initialized=d.setupDone=true;d.openingCents=n;return d};
(async()=>{
 const a=device('a');a.storage.set('clair-github-money-v3',JSON.stringify(budget(1700)));await a.init();
 assert.equal(a.cloud.record,null);assert(a.storage.has('clair-github-money-v3'));assert.equal(rows.size,0);
 a.edit(budget(1700));await a.cloud.sync();assert.equal(rows.get('a').revision,1);
 const b=device('a');await b.init();assert.equal(b.cloud.record.payload.openingCents,1700);
 a.edit(budget(1800));b.edit(budget(1900));await a.cloud.sync();await b.cloud.sync();
 assert.equal(rows.get('a').payload.openingCents,1800);assert.equal(b.cloud.status,'conflict');assert.equal(b.cloud.record.payload.openingCents,1900);
 b.cloud.resolve(false);await b.cloud.sync();assert.equal(rows.get('a').revision,3);assert.equal(rows.get('a').payload.openingCents,1900);
 console.log('PASS: first transfer is explicit; two-device conflict preserves both budgets; explicit resolution');
 const other=device('b',a.storage);await other.init();assert.equal(other.cloud.record,null);other.edit(budget(9900));await other.cloud.sync();assert.equal(rows.get('a').payload.openingCents,1900);assert.equal(rows.get('b').payload.openingCents,9900);
 console.log('PASS: account caches, pending writes and remote records remain separate');
 b.edit(budget(2000));loseResponse=true;await b.cloud.sync();assert(b.cloud.record.meta.dirty);const revision=rows.get('a').revision;await b.cloud.sync();assert.equal(rows.get('a').revision,revision);assert.equal(b.cloud.status,'synced');
 console.log('PASS: lost server response retries idempotently without double saving');
 b.edit(budget(2100));let resolve;saveDelay=new Promise(r=>resolve=r);const pending=b.cloud.sync();await new Promise(r=>setImmediate(r));b.edit(budget(2200));resolve();await pending;saveDelay=null;
 assert.equal(b.cloud.record.payload.openingCents,2200);assert(b.cloud.record.meta.dirty);await b.cloud.sync();assert.equal(rows.get('a').payload.openingCents,2200);
 console.log('PASS: a new purchase during an in-flight save is retained');
 b.navigator.onLine=false;b.edit(budget(2300));await b.cloud.sync();assert.equal(b.cloud.status,'offline');assert(b.cloud.record.meta.dirty);const restored=device('a',b.storage);restored.navigator.onLine=false;await restored.init();assert.equal(restored.cloud.record.payload.openingCents,2300);restored.navigator.onLine=true;await restored.cloud.sync();assert.equal(rows.get('a').payload.openingCents,2300);
 console.log('PASS: offline writes survive reload and reconnect');
 const photos=budget(2400);photos.preferences.photo='data:image/jpeg;base64,abc';photos.preferences.wallpaper='photo';assert.equal(b.cloud.wire(photos).preferences.photo,null);assert.equal(photos.preferences.photo,'data:image/jpeg;base64,abc');
 await restored.cloud.logout();assert(!restored.storage.has(restored.cloud.key('a')));assert(a.storage.has('clair-github-money-v3'));
 console.log('PASS: sign-out removes account cache; original local budget remains; photos are not transmitted');
 const bad=device('c');bad.storage.set(bad.cloud.key('c'),'{broken');await bad.init();assert.equal(bad.cloud.status,'error');assert.equal(bad.cloud.record,null);assert.equal(bad.storage.get(bad.cloud.key('c')),'{broken');
 console.log('PASS: corrupt cache is retained; no previous account data is displayed');
 const blocked=device('blocked-storage');let cacheFailure;
 blocked.localStorage.getItem=()=>{throw Error('SecurityError: storage blocked')};
 blocked.cloud.hooks.badCache=(error,raw)=>{cacheFailure={message:error.message,raw};assert.equal(blocked.cloud.ready,true);assert.equal(blocked.cloud.status,'error')};
 await blocked.init();assert.equal(blocked.cloud.status,'error');assert.equal(blocked.cloud.ready,true);assert.equal(blocked.cloud.record,null);assert.equal(cacheFailure.message,'SecurityError: storage blocked');assert.equal(cacheFailure.raw,null);assert.equal(blocked.writes.length,0);
 console.log('PASS: blocked storage reports the original error without rereading storage or writing a budget');
 const duplicate=device('duplicate');let unlock;readDelay=new Promise(r=>unlock=r);const opening=duplicate.init();await new Promise(r=>setImmediate(r));const epoch=duplicate.cloud.epoch;await duplicate.cloud.attach({id:'duplicate',email:'duplicate@example.test'});assert.equal(duplicate.cloud.epoch,epoch);unlock();await opening;readDelay=null;assert.equal(duplicate.cloud.status,'synced');
 console.log('PASS: duplicate SDK session events do not restart or block opening');
 const sameA=device('same'),sameB=device('same');await sameA.init();sameA.edit(budget(100));await sameA.cloud.sync();await sameB.init();sameA.edit(budget(200));sameB.edit(budget(200));await sameA.cloud.sync();await sameB.cloud.sync();assert.equal(sameB.cloud.status,'synced');assert.equal(sameB.cloud.conflict,null);
 console.log('PASS: identical automatic updates from two devices do not create a false conflict');
 const quotaA=device('quota'),quotaB=device('quota');await quotaA.init();quotaA.edit(budget(100));await quotaA.cloud.sync();await quotaB.init();quotaA.edit(budget(200));quotaB.edit(budget(300));await quotaA.cloud.sync();await quotaB.cloud.sync();
 const preserved=JSON.stringify(quotaB.cloud.record),cached=quotaB.storage.get(quotaB.cloud.key()),conflict=quotaB.cloud.conflict,applied=quotaB.applications.length;
 const persist=quotaB.localStorage.setItem;quotaB.localStorage.setItem=()=>{throw Error('QuotaExceededError')};
 for(const remote of [false,true]){
  assert.throws(()=>quotaB.cloud.resolve(remote),/QuotaExceededError/);
  assert.equal(JSON.stringify(quotaB.cloud.record),preserved,'failed resolution must preserve in-memory budget and metadata');
  assert.equal(quotaB.storage.get(quotaB.cloud.key()),cached);assert.equal(quotaB.cloud.conflict,conflict);assert.equal(quotaB.cloud.status,'conflict');assert.equal(quotaB.applications.length,applied);
 }
 quotaB.localStorage.setItem=persist;quotaB.cloud.resolve(false);await quotaB.cloud.sync();assert.equal(rows.get('quota').payload.openingCents,300);assert.equal(quotaB.cloud.status,'synced');
 console.log('PASS: storage failure preserves both conflict copies and metadata; retry succeeds after storage recovers');
 const recovered=device('recovery-original');await recovered.init();let recoveryUser;
 recovered.cloud.hooks.recovery=user=>{recoveryUser=user.id};
 const recoveryTarget={id:'recovery-target',email:'target@example.test',user_metadata:{}};
 recovered.setUser(recoveryTarget);recovered.authEvent('PASSWORD_RECOVERY',{user:recoveryTarget});
 assert.equal(recoveryUser,'recovery-target');assert.equal(recovered.cloud.ready,false);assert.equal(recovered.cloud.status,'loading');
 await recovered.cloud.attach(recoveryTarget);assert.equal(recovered.cloud.user.id,'recovery-target');assert.equal(recovered.cloud.record,null);
 console.log('PASS: recovery for another account waits for its session and never uses the previous budget');
 console.log('PASS: all scripts parse; original financial engine unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
