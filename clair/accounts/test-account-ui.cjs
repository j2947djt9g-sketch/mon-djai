const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function context(storage=new Map(),initialTime=Date.now()){
 const nodes=new Map(),requests=[],replies=[];let clock=initialTime;
 const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},disabled:false,open:false,showModal(){this.open=true},close(){this.open=false},addEventListener(){},scrollIntoView(){},focus(){}});return nodes.get(s)};
 const query=s=>{
  if(['#account-form','#account-forgot-form','#account-password-form','#account-loading'].includes(s)&&!node('#page').innerHTML.includes('id="'+s.slice(1)+'"'))return null;
  if(s==='#account-form input[name="email"]'&&!node('#page').innerHTML.includes('id="account-form"'))return null;
  return node(s);
 };
 const client={auth:{signInWithPassword:async p=>{requests.push(p);return replies.shift()},signUp:async p=>{requests.push(p);return replies.shift()},resetPasswordForEmail:async()=>({}),updateUser:async()=>({})}};
 const DateMock=class extends Date{static now(){return clock}};
 const sandbox={Intl,Date:DateMock,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{origin:'https://example.test',protocol:'https:',href:'https://example.test/clair/',pathname:'/clair/'},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:query,addEventListener(){}},supabase:{createClient:()=>client},CLAIR_ACCOUNT_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'},FormData:class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}}};
 sandbox.window=sandbox;sandbox.addEventListener=()=>{};
 vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
 let ui=scripts[3];const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 ui=ui.slice(0,boot)+'window.test={cloud,render,accountGate,accountCard,accountSubmit,accountAction,accountStatus,legacyBudget,transferLegacy,updateLoginButtons,setData(d){data=d},getData(){return data;}};})();';vm.runInContext(ui,sandbox);const t=sandbox.test;
 t.cloud.ready=true;t.cloud.status='signed-out';
 const form={id:'account-form',dataset:{mode:'login'},values:{email:'a@example.test',password:'wrong'},querySelector:()=>node('#submit'),reset(){}};
 return {t,sandbox,node,requests,replies,storage,form,now:()=>clock,advance:ms=>clock+=ms,error:()=>node('#account-error').textContent,wrong:()=>{replies.push({data:{session:null,user:null},error:{code:'invalid_credentials',status:400}});return t.accountSubmit(form)}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const a=context(),{t,node,storage}=a;
 const legacy=a.sandbox.ClairEngine.empty();legacy.initialized=legacy.setupDone=true;legacy.openingCents=1700;storage.set('clair-github-money-v3',JSON.stringify(legacy));
 t.render();assert(!node('#page').innerHTML.includes('17,00'));assert(node('#page').innerHTML.includes('account-form'));
 console.log('PASS login gate hides existing budget until account authentication');

 storage.set('clair-auth-attempts-v1',JSON.stringify({count:3,until:a.now()+3600000}));
 await a.wrong();assert.equal(a.requests.length,1);assert.equal(node('#submit').disabled,false);assert.match(a.error(),/2 essais/);
 await a.wrong();assert.equal(a.requests.length,2);assert.equal(node('#submit').disabled,false);assert.match(a.error(),/1 essai/);
 await a.wrong();assert.equal(a.requests.length,3);assert.equal(node('#submit').disabled,true);assert.match(a.error(),/heure/);
 await a.wrong();assert.equal(a.requests.length,3,'A fourth password request must not reach Auth');
 const reloaded=context(storage,a.now());await reloaded.wrong();assert.equal(reloaded.requests.length,0,'Reload must keep the pause');assert.equal(reloaded.node('#submit').disabled,true);
 reloaded.advance(3599999);await reloaded.wrong();assert.equal(reloaded.requests.length,0,'The pause must last a full hour');
 reloaded.advance(1);await reloaded.wrong();assert.equal(reloaded.requests.length,1);assert.equal(reloaded.node('#submit').disabled,false);assert.match(reloaded.error(),/2 essais/);
 a.form.values.email='other@example.test';await a.wrong();assert.equal(a.requests.length,4);assert.equal(node('#submit').disabled,false,'Another address has its own retry budget');
 await t.accountAction('account-forgot');assert.match(node('#page').innerHTML,/account-forgot-form/);assert.match(node('#page').innerHTML,/Contacter l’administrateur/);
 assert(![...storage.values()].some(value=>value.includes('wrong')),'Never persist passwords');
 console.log('PASS two retries, third-failure hour pause, no fourth request, reload persistence, expiry, address isolation and accessible recovery');

 const b=context();
 for(const error of [{code:'email_not_confirmed',status:400},{code:'over_email_send_rate_limit',status:429},{code:'over_request_rate_limit',status:429},{status:503}]){
  b.replies.push({data:{session:null,user:null},error});await b.t.accountSubmit(b.form);assert.equal(b.node('#submit').disabled,false);
 }
 await b.wrong();assert.match(b.error(),/2 essais/,'Only invalid credentials consume a retry');
 let unlock;b.replies.push(new Promise(resolve=>{unlock=resolve}));const pending=b.t.accountSubmit(b.form);await b.t.accountSubmit(b.form);
 for(let i=0;i<30&&b.requests.length<6;i++)await tick();assert.equal(b.requests.length,6,'Concurrent submit must not duplicate Auth calls');
 unlock({data:{session:null,user:null},error:{code:'invalid_credentials',status:400}});await pending;assert.match(b.error(),/1 essai/);
 b.t.cloud.attach=async()=>{};b.replies.push({data:{session:{user:{id:'u',email:'a@example.test'}},user:{id:'u',email:'a@example.test'}},error:null});await b.t.accountSubmit(b.form);
 await b.wrong();assert.match(b.error(),/2 essais/,'Successful login resets consecutive failures');
 console.log('PASS confirmation/provider errors are not wrong passwords, duplicate submissions are prevented and success resets the counter');


 const d=context();await d.wrong();await d.wrong();await d.wrong();
 d.node('#account-form').dataset.mode='login';d.node('#account-form').querySelector=selector=>selector.startsWith('input')?{value:'a@example.test'}:d.node('#submit');
 d.advance(3600000);d.t.updateLoginButtons();assert.equal(d.node('#submit').disabled,false);assert.doesNotMatch(d.error(),/une heure/,'Expiry must clear stale lock wording');
 const offline=context();offline.sandbox.navigator.onLine=false;await offline.wrong();assert.equal(offline.requests.length,0);offline.sandbox.navigator.onLine=true;await offline.wrong();assert.match(offline.error(),/2 essais/);
 const corrupt=context();await corrupt.wrong();const key=[...corrupt.storage.keys()].find(k=>k.startsWith('clair-login-attempts-v2-'));corrupt.storage.set(key,'broken JSON');const fresh=context(corrupt.storage,corrupt.now());await fresh.wrong();assert.match(fresh.error(),/2 essais/);
 const unavailable=context();unavailable.sandbox.localStorage.getItem=()=>{throw Error('storage unavailable')};unavailable.sandbox.localStorage.setItem=()=>{throw Error('storage unavailable')};await unavailable.wrong();await unavailable.wrong();await unavailable.wrong();await unavailable.wrong();assert.equal(unavailable.requests.length,3);
 console.log('PASS expired UI is restored; offline/malformed/unavailable storage do not create a one-error lock');

 const c=context();await c.t.accountAction('account-mode');c.replies.push({data:{session:null,user:{}}});c.form.dataset.mode='signup';c.form.values={email:'a@example.test',password:'twelve-character-password',displayName:'  El-Hadj  '};await c.t.accountSubmit(c.form);
 assert.equal(c.requests.at(-1).options.data.display_name,'El-Hadj');const confirmation=c.t.accountGate();assert.match(confirmation,/confirmation/);assert.match(confirmation,/clique/i);assert.match(confirmation,/indésirables/);
 c.t.cloud.user={id:'user-a',email:'a@example.test'};c.t.cloud.displayName='<img src=x onerror=alert(1)>';assert(c.t.accountCard().includes('&lt;img'));assert(!c.t.accountCard().includes('<img src=x'));
 c.storage.set('clair-local-owner-v1','user-b');assert.equal(c.t.legacyBudget(),null);
 console.log('PASS signup confirmation gives link/spam instructions, escaped profile text and local budget ownership');
 console.log('ALL ACCOUNT UI CHECKS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});