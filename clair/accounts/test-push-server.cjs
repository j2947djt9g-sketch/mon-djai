const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {remindersFor,parisTime,validateSubscription}=await import('../../supabase/functions/clair-reminders/schedule.mjs');
 const {createHandler}=await import('../../supabase/functions/clair-reminders/handler.mjs');
 const html=fs.readFileSync(__dirname+'/../index.html','utf8'),box={window:{},Intl,Date};vm.createContext(box);vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],box);const E=box.window.ClairEngine;
 const rule=(id,day=23)=>({id,name:id,categoryId:'abonnements',kind:'monthly',start:'2026-01-01',end:null,day,month:10,amountCents:999,amounts:[],pauses:[],reminderEnabled:true});
 const d=E.empty();d.initialized=d.setupDone=true;d.openingBalanceDate='2026-01-01';d.rules=[rule('phone'),rule('end','last'),{...rule('annual',29),kind:'yearly',month:2}, {...rule('paused',31),pauses:[{start:'2027-01-01',end:'2027-04-30'}]}];
 for(let date='2026-01-01';date<'2028-01-01';date=E.addDays(date,1)){
   const due=E.addDays(date,2),expected=E.occurrences(d,due,due).map(x=>x.autoKey);
   assert.deepEqual(remindersFor(d,date).map(x=>x.key).sort(),Array.from(expected).sort(),'Calendar differs on '+date);
 }
 assert(remindersFor(d,'2028-02-27').some(r=>r.key==='annual:2028-02-29'));
 assert.equal(parisTime(new Date('2026-10-20T22:30:00Z')).date,'2026-10-21');
 for(const iso of ['2026-03-29T07:00:00Z','2026-10-25T08:00:00Z'])assert.equal(parisTime(new Date(iso)).hour,9);
 for(const disabled of [ {...d,preferences:{reminders:false}}, {...d,initialized:false}, {...d,setupDone:false}])assert.equal(remindersFor(disabled,'2026-10-21').length,0);
 const q=structuredClone(d);q.rules=[rule('phone')];q.transactions=[{autoKey:'phone:2026-10-23'}];assert.equal(remindersFor(q,'2026-10-21').length,0);q.transactions=[];q.skipped=['phone:2026-10-23'];assert.equal(remindersFor(q,'2026-10-21').length,0);
 const sub={endpoint:'https://fcm.googleapis.com/test',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
 for(const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/','https://fcm.googleapis.com.evil.test/a','https://user:pass@fcm.googleapis.com/'])assert.throws(()=>validateSubscription({...sub,endpoint}));
 assert.throws(()=>validateSubscription({...sub,keys:{}}));
 console.log('PASS two years match the financial engine, month ends, leap day, Paris DST, preferences, already paid and SSRF rejection');
 let clock=new Date('2026-10-21T07:00:00Z'),sent=[],fail=false,keys={public_key:null,private_key:null,cron_secret:'server-secret'},latest={...d,rules:[rule('phone')]};
 const devices=new Map(),claims=new Map();let budgetsRead=0,onBudget=null;
 const db={
   config:async()=>keys,initKeys:async k=>{if(!keys.public_key)keys={...keys,public_key:k.publicKey,private_key:k.privateKey}},
   devices:async()=>[...devices.values()].filter(x=>x.enabled),device:async id=>devices.get(id),deviceCount:async uid=>[...devices.values()].filter(x=>x.user_id===uid).length,
   subscribe:async value=>devices.set(value.device_id,value),disable:async id=>{devices.get(id).enabled=false},
   budget:async uid=>{budgetsRead++;if(onBudget)onBudget(budgetsRead);return uid==='alice'?latest:null},
   claim:async(id,key,claim)=>{const k=id+key;if(claims.has(k))return false;claims.set(k,claim);return true},
   complete:async()=>{},release:async(id,key)=>claims.delete(id+key)
 };
 const handler=createHandler({db,now:()=>clock,randomId:()=>crypto.randomUUID(),authenticate:async h=>h==='Bearer alice'?{id:'alice'}:h==='Bearer bob'?{id:'bob'}:null,generateKeys:()=>({publicKey:'public',privateKey:'never-return-this'}),send:async(s,p)=>{if(fail)throw Object.assign(Error('gone'),{statusCode:410});sent.push(p)}});
 const call=async(route,body={},headers={authorization:'Bearer alice'})=>handler(new Request('https://example.test/clair-reminders/'+route,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}));
 assert.equal((await call('vapid',{},{})).status,401);let response=await call('vapid');assert.deepEqual(await response.json(),{publicKey:'public'});assert(!JSON.stringify(await (await call('vapid')).json()).includes('never-return'));
 assert.equal((await call('vapid',{}, {authorization:'Bearer alice',origin:'https://evil.test'})).status,403);
 assert.equal((await call('subscribe',{deviceId:'bad',subscription:sub})).status,400);
 const id='a'.repeat(32);assert.equal((await call('subscribe',{deviceId:id,user_id:'bob',subscription:sub})).status,200);assert.equal(devices.get(id).user_id,'alice');
 assert.equal((await call('unsubscribe',{deviceId:id},{authorization:'Bearer bob'})).status,409);
 assert.equal((await call('dispatch')).status,401);const cron={'x-clair-cron-secret':'server-secret'};
 clock=new Date('2026-10-21T06:59:00Z');assert.equal((await (await call('dispatch',{},cron)).json()).outsideWindow,true);assert.equal(sent.length,0);
 clock=new Date('2026-10-21T07:00:00Z');await Promise.all([call('dispatch',{},cron),call('dispatch',{},cron)]);assert.equal(sent.length,1);assert.match(sent[0].body,/9,99/);assert.equal(sent[0].tag,'clair-phone:2026-10-23');assert(!JSON.stringify(sent).includes('openingCents'));
 await call('dispatch',{},cron);assert.equal(sent.length,1);
 claims.clear();onBudget=n=>{if(n===2)latest={...latest,preferences:{reminders:false}}};budgetsRead=0;await call('dispatch',{},cron);assert.equal(sent.length,1);onBudget=null;
 latest={...latest,preferences:{reminders:true}};claims.clear();fail=true;await call('dispatch',{},cron);assert.equal(devices.get(id).enabled,false);fail=false;
 await call('subscribe',{deviceId:id,subscription:sub});await call('unsubscribe',{deviceId:id});assert.equal((await (await call('status',{deviceId:id})).json()).active,false);assert.equal(devices.get(id).enabled,false);
 console.log('PASS authenticated opt-in, ownership, private keys, cron authentication, 09:00 Paris, concurrent deduplication, latest account changes, expired endpoints and disabling');
})().catch(error=>{console.error(error);process.exitCode=1});

