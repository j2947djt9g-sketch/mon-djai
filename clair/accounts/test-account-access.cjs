// The real cloud controller must stop a cached account after an administrator suspension.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const source=fs.readFileSync(__dirname+'/cloud.js','utf8');
function device(){
 const user={id:'account-a',email:'owner@example.invalid',user_metadata:{}},storage=new Map();
 const payload={initialized:true,transactions:[{id:'history',amountCents:1200}],preferences:{}};
 const remote={payload,revision:4,operation_id:'previous',display_name:'Owner'};
 storage.set('clair-account-budget-v1-'+user.id,JSON.stringify({...payload,_cloud:{userId:user.id,revision:4,operationId:'previous',dirty:false}}));
 let suspended=false,unavailable=false,saveCount=0,accessCalls=0;
 const navigator={onLine:true},client={auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user}}}),signOut:async()=>({})},
  from:()=>({select(){return this},eq(){return this},async maybeSingle(){return {data:suspended?null:structuredClone(remote)}}}),
  async rpc(name){if(name==='clair_account_active'){accessCalls++;return unavailable?{error:{message:'Unavailable'}}:{data:!suspended};}saveCount++;throw Error('A suspended account must never save');}};
 const context={window:{},crypto,structuredClone,JSON,Error,Number,String,Date,navigator,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){}};
 vm.createContext(context);vm.runInContext(source,context);
 const cloud=new context.window.ClairCloud({url:'https://testproject.supabase.co',key:'sb_publishable_test'},{normalize:structuredClone,status(){},enter(){},apply(){}},{createClient:()=>client});
 return {cloud,storage,navigator,setSuspended:v=>suspended=v,setUnavailable:v=>unavailable=v,counts:()=>({saveCount,accessCalls})};
}
(async()=>{
 const d=device();await d.cloud.init();const original=d.storage.get(d.cloud.key());
 d.setSuspended(true);await d.cloud.sync();
 assert.equal(d.cloud.status,'suspended','a ban must not look like an empty or conflicting budget');
 assert.equal(d.cloud.record.payload.transactions[0].id,'history');assert.equal(d.storage.get(d.cloud.key()),original);
 assert.throws(()=>d.cloud.pack({transactions:[]}),/Paie ton abonnement/);
 await assert.rejects(d.cloud.requireWriteAccess(),/Paie ton abonnement/);assert.equal(d.counts().saveCount,0);
 console.log('PASS suspension: cached history retained; local writes and cloud saves blocked after an already-open account is suspended');
 d.navigator.onLine=false;await assert.rejects(d.cloud.requireWriteAccess(),/Paie ton abonnement/);
 assert.equal(d.storage.get(d.cloud.key()),original);
 d.navigator.onLine=true;d.setSuspended(false);await d.cloud.requireWriteAccess();await d.cloud.sync();
 assert.equal(d.cloud.status,'synced');assert.doesNotThrow(()=>d.cloud.pack(d.cloud.record.payload));
 assert.equal(d.cloud.record.payload.transactions.length,1);
 console.log('PASS restoration: fresh authorization restores writes without replacing account history');
 d.setUnavailable(true);await assert.rejects(d.cloud.requireWriteAccess(),/connexion|vérifier/i);
 assert.throws(()=>d.cloud.pack({transactions:[]}),/vérifier|connexion/i);
 d.setUnavailable(false);await d.cloud.requireWriteAccess();d.navigator.onLine=false;
 await assert.rejects(d.cloud.requireWriteAccess(),/connexion|vérifier/i);assert.equal(d.storage.get(d.cloud.key()),original);
 console.log('PASS verification failure: no local mutation while account authorization is unknown or offline');
})().catch(error=>{console.error(error);process.exitCode=1;});
