function runTests(){
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),storage=new Map(),events={},closeTasks=[];
// Native dialog.close() removes open now, then dispatches close in a later task.
const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,content:'',listeners:{},showCount:0,showModal(){this.open=true;this.showCount++;},close(){if(this.open){this.open=false;closeTasks.push(()=>this.listeners.close?.());}},addEventListener(type,fn){this.listeners[type]=fn;},scrollIntoView(){},focus(){}});return nodes.get(s);};
const flushClose=()=>{while(closeTasks.length)closeTasks.shift()();};
const click=(action,extra={})=>events.click({target:{closest:()=>({dataset:{action,...extra}})}});
let payloads=[],notifications=[],fetched=[];
const sandbox={Intl,Date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{protocol:'https:',href:'https://example.test/clair/'},navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn;}},btoa:text=>Buffer.from(text,'binary').toString('base64'),fetch:async url=>{fetched.push(String(url));return {ok:true,text:async()=>html,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
let ui=scripts[3];const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert.ok(boot>0);
ui=ui.slice(0,boot)+`
download=(body,name,mime)=>window.captureDownload(body,name,mime);
notify=message=>window.captureNotify(message);
window.test={pushApi,enablePush,disablePush,syncPush,pushState,renderReminders,configure(uid){cloud.enabled=true;cloud.user=uid?{id:uid}:null;cloud.ready=true;cloud.status='synced';cloud.conflict=null;cloud.record={meta:{dirty:false}};cloud.sync=async()=>{};cloud.client={auth:{getSession:()=>window.mockSession()}};PUSH_KEY='push-'+uid;window.CLAIR_ACCOUNT_CONFIG={key:'sb_publishable_test'};render=()=>{};},settings,startCharge,chargeView,collectCharge,submitCharge,payCard,paymentDetails,pay,installClair,downloadClair,
 setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot);},
 getData(){return data;},draft(){return chargeDraft;},setDraft(d){chargeDraft=d;},modal(){return modal;},
 setPrompt(p){installPrompt=p;},busy(){return {installBusy,downloadBusy};}};
})();`;
sandbox.captureDownload=(body,name,mime)=>payloads.push({body,name,mime});sandbox.captureNotify=message=>notifications.push(message);
vm.runInContext(ui,sandbox);
const E=sandbox.ClairEngine,t=sandbox.test,d=E.empty(),today=E.today();d.initialized=true;d.setupDone=true;d.openingCents=100000;d.openingBalanceDate=today;t.setData(d);
const form=o=>({get:k=>o[k]??null});

(async()=>{
 const publicKey=Buffer.alloc(65,2).toString('base64url'),api=[],registration={};let permission='granted',sub=null,unsubscribed=0,pendingVapid=null,sessionError=false;
 const makeSub=key=>({options:{applicationServerKey:key.buffer},toJSON:()=>({endpoint:'https://fcm.googleapis.com/demo',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}),async unsubscribe(){unsubscribed++;sub=null;return true;}});
 sandbox.atob=s=>Buffer.from(s,'base64').toString('binary');
 sandbox.Notification={permission:'granted',requestPermission:async()=>permission};sandbox.PushManager=function(){};
 registration.pushManager={getSubscription:async()=>sub,subscribe:async({applicationServerKey})=>(sub=makeSub(applicationServerKey))};
 sandbox.navigator.serviceWorker={ready:Promise.resolve(),register:async()=>registration,getRegistration:async()=>registration};
 sandbox.mockSession=async()=>({data:{session:sessionError?null:{user:{id:tUser},access_token:'token-'+tUser}},error:sessionError?Error('expired'):null});
 let tUser='alice';t.configure(tUser);
 sandbox.fetch=async(url,options)=>{
   api.push({url,body:JSON.parse(options.body),headers:options.headers});assert.equal(options.headers.authorization,'Bearer token-'+tUser);
   if(url.endsWith('/vapid')){if(pendingVapid)await pendingVapid;return {ok:true,json:async()=>({publicKey})};}
   return {ok:true,json:async()=>({active:!url.endsWith('/unsubscribe')})};
 };
 permission='denied';await t.enablePush();assert.equal(api.length,0);assert.equal(sub,null);assert.equal(t.pushState().active,false);
 permission='granted';await t.enablePush();assert.equal(t.pushState().active,true);assert.match(t.pushState().deviceId,/^[a-f0-9]{32}$/);
 const posted=api.find(x=>x.url.endsWith('/subscribe'));assert(posted);assert.deepEqual(Object.keys(posted.body).sort(),['deviceId','subscription']);assert(!JSON.stringify(api).includes('openingCents'));assert(!JSON.stringify(api).includes('secret'));
 await t.syncPush();assert.equal(t.pushState().active,true);
 await t.disablePush();assert.equal(t.pushState().active,false);assert.equal(sub,null);assert.equal(unsubscribed,1);
 sessionError=true;const previous=api.length;await assert.rejects(()=>t.pushApi('/vapid',{}),/session/);assert.equal(api.length,previous);sessionError=false;
 let resume;pendingVapid=new Promise(resolve=>resume=resolve);const activation=t.enablePush();await new Promise(resolve=>setImmediate(resolve));
 tUser='bob';t.configure(tUser);resume();await activation;pendingVapid=null;
 assert.equal(t.pushState(),null);assert.equal(sub,null,'Changing account must not create or preserve the previous activation');
 t.configure(null);const before=api.length;await assert.rejects(()=>t.pushApi('/status',{}),/Connecte/);assert.equal(api.length,before);
 console.log('PASS push UI: permission refusal, explicit opt-in, JWT identity, minimal payload, disable, expired session and account change during activation');
})().catch(error=>{console.error(error);process.exitCode=1;});
}
runTests();
