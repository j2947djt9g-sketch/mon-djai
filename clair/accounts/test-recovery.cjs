const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function context(hash=''){
 const nodes=new Map(),storage=new Map(),calls={mail:[],password:[]};let mailError=null,passwordError=null,mailWait=null,passwordWait=null,clock=Date.now();
 const DateMock=class extends Date{static now(){return clock}};
 function node(s){if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',value:'',type:'password',style:{},dataset:{},open:false,showModal(){this.open=true},close(){this.open=false},addEventListener(){},scrollIntoView(){},focus(){},setAttribute(k,v){this[k]=v}});return nodes.get(s)}
 function query(s){
   const p=node('#page').innerHTML;
   if(s==='#account-form input[name="email"]')return p.includes('id="account-form"')?node(s):null;
   const ids=['account-form','account-forgot-form','account-password-form','account-reset-send','account-reset-resend','account-new-password','recovery-title'];
   if(s.startsWith('#')&&ids.includes(s.slice(1))&&!p.includes('id="'+s.slice(1)+'"'))return null;
   if(s==='[data-action="account-password-toggle"]'&&!p.includes('data-action="account-password-toggle"'))return null;
   return node(s);
 }
 const client={auth:{resetPasswordForEmail:async(email,options)=>{calls.mail.push({email,options});if(mailWait)await mailWait;return {error:mailError}},updateUser:async p=>{calls.password.push(p);if(passwordWait)await passwordWait;return {error:passwordError}}}};
 const s={Intl,Date:DateMock,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,
   setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{origin:'https://example.test',protocol:'https:',pathname:'/clair/',href:'https://example.test/clair/'+hash,hash,search:''},
   navigator:{onLine:true},history:{replaceState(){s.location.hash=''}},matchMedia:()=>({matches:false,addEventListener(){}}),
   localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
   document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:query,addEventListener(){}},
   supabase:{createClient:()=>client},CLAIR_ACCOUNT_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'},
   FormData:class{constructor(f){this.values=f.values}get(k){return this.values[k]??null}}};
 s.window=s;s.addEventListener=()=>{};vm.createContext(s);vm.runInContext(scripts[0],s);vm.runInContext(process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):scripts[2],s);
 const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 vm.runInContext(scripts[3].slice(0,boot)+'window.test={cloud,render,recoveryView,accountAction,accountSubmit,accountMessage,updateRecoveryButtons,state:()=>({step:accountResetStep,email:accountResetEmail}),setData:d=>{data=d;}};})();',s);
 const t=s.test;t.cloud.ready=true;t.cloud.status='signed-out';
 return {s,t,node,query,client,calls,mailError:e=>mailError=e,passwordError:e=>passwordError=e,delayMail:p=>mailWait=p,delayPassword:p=>passwordWait=p,advance:ms=>clock+=ms};
}
const form=(id,values)=>({id,values,querySelector:()=>({disabled:false})});
async function main(){
 const a=context(),{t,s,node,calls}=a;t.render();node('#account-form input[name="email"]').value='elhadj@example.invalid';
 await t.accountAction('account-forgot');assert.equal(t.state().email,'elhadj@example.invalid');assert.match(t.recoveryView(),/elhadj@example.invalid/);
 await t.accountSubmit(form('account-forgot-form',{email:'elhadj@example.invalid'}));assert.equal(t.state().step,'sent');
 assert.match(t.recoveryView(),/Si un compte utilise cette adresse/);assert.match(t.recoveryView(),/indésirables/);
 assert.equal(calls.mail[0].options.redirectTo,'https://example.test/clair/');
 assert.doesNotMatch(t.recoveryView(),/Renvoyer dans|Réessayer dans/);assert.equal(node('#account-reset-resend').disabled,false);
 await t.accountAction('account-reset-resend');assert.equal(calls.mail.length,2);
 await t.accountAction('account-reset-edit');assert.equal(t.state().email,'elhadj@example.invalid');assert.equal(node('#account-reset-send').disabled,false);
 await t.accountSubmit(form('account-forgot-form',{email:' CORRECTED@example.invalid '}));assert.equal(calls.mail.length,3);assert.equal(t.state().email,'corrected@example.invalid');
 await t.accountAction('account-reset-resend');assert.equal(calls.mail.length,4);
 await t.accountAction('account-reset-back');assert.equal(t.state().step,null);assert.match(node('#page').innerHTML,/corrected@example.invalid/);
 console.log('PASS: normalized/retained e-mail, neutral confirmation, no countdown, immediate resend/edit and return');
 const limited=context();limited.t.render();await limited.t.accountAction('account-forgot');limited.mailError({status:429});await limited.t.accountSubmit(form('account-forgot-form',{email:'test@example.invalid'}));
 assert.match(limited.node('#account-error').textContent,/limité/);assert.equal(limited.node('#account-reset-send').disabled,false);assert.doesNotMatch(limited.t.recoveryView(),/Réessayer dans/);
 const offline=context();offline.t.render();await offline.t.accountAction('account-forgot');offline.s.navigator.onLine=false;offline.mailError({name:'AuthRetryableFetchError'});await offline.t.accountSubmit(form('account-forgot-form',{email:'test@example.invalid'}));assert.match(offline.node('#account-error').textContent,/Internet/);assert.equal(offline.calls.mail.length,0);
 const pending=context();pending.t.render();await pending.t.accountAction('account-forgot');let releaseMail;pending.delayMail(new Promise(r=>releaseMail=r));const sending=pending.t.accountSubmit(form('account-forgot-form',{email:'test@example.invalid'}));await Promise.resolve();assert.equal(pending.node('#account-reset-send').disabled,true);await pending.t.accountSubmit(form('account-forgot-form',{email:'test@example.invalid'}));assert.equal(pending.calls.mail.length,1);releaseMail();await sending;assert.equal(pending.node('#account-reset-resend').disabled,false);
 console.log('PASS: rate limit/network failure shown on the active screen');
 const expired=context('#error=access_denied&error_code=otp_expired');expired.t.render();assert.match(expired.node('#page').innerHTML,/Ce lien ne fonctionne plus/);await expired.t.accountAction('account-reset-edit');assert.equal(expired.s.location.hash,'');
 const invalid=context('#type=recovery');invalid.t.cloud.user={id:'unrelated-user'};invalid.t.cloud.hooks.status();assert.equal(invalid.t.state().step,'expired');await invalid.t.accountSubmit(form('account-password-form',{password:'long enough password'}));assert.equal(invalid.calls.password.length,0);
 console.log('PASS: expired/incomplete links and unrelated sessions do not change a password');
 const valid=context('#type=recovery'),v=valid.t,user={id:'valid-user',email:'test@example.invalid'};v.cloud.user=user;v.cloud.hooks.recovery(user);v.cloud.status='synced';v.cloud.hooks.status();
 assert.equal(v.state().step,'password');assert.match(v.recoveryView(),/12 caractères/);
 await v.accountSubmit(form('account-password-form',{password:'short'}));assert.equal(valid.calls.password.length,0);assert.match(valid.node('#account-error').textContent,/12/);
 valid.passwordError({code:'same_password'});await v.accountSubmit(form('account-password-form',{password:'a longer password phrase'}));assert.match(valid.node('#account-error').textContent,/différent/);assert.equal(v.state().step,'password');
 const data=valid.s.ClairEngine.empty();data.initialized=data.setupDone=true;data.openingCents=1700;v.setData(data);
 v.cloud.hooks.apply(data,JSON.stringify(data));assert.equal(v.state().step,'password');
 valid.s.localStorage.setItem('clair-auth-attempts-v1',JSON.stringify({count:3,until:Date.now()+60000}));
 valid.passwordError(null);await v.accountSubmit(form('account-password-form',{password:'a longer password phrase'}));assert.equal(v.state().step,'done');assert.match(v.recoveryView(),/Accéder à mon budget/);assert.equal(valid.s.localStorage.getItem('clair-auth-attempts-v1'),null);
 await v.accountAction('account-reset-finish');assert.equal(v.state().step,null);assert.match(valid.node('#page').innerHTML,/17,00/);
 console.log('PASS: verified recovery, password rules, error retry, sync does not dismiss recovery, direct budget return');
 const lost=context('#type=recovery');lost.t.cloud.user=user;lost.t.cloud.hooks.recovery(user);lost.t.cloud.status='synced';lost.t.cloud.hooks.status();lost.passwordError({status:401,code:'session_not_found'});await lost.t.accountSubmit(form('account-password-form',{password:'a longer password phrase'}));assert.equal(lost.t.state().step,'expired');
 const modal=context();modal.node('#dialog').open=true;modal.t.accountMessage('Visible error');assert.equal(modal.node('#form-error').textContent,'Visible error');
 assert(html.includes(fs.readFileSync(__dirname+'/account-ui.js','utf8').trimEnd()));
 assert(html.includes(fs.readFileSync(__dirname+'/cloud.js','utf8').trimEnd()));
 console.log('PASS: expired session, modal error placement, embedded source matches standalone files');
 const switched=context('#type=recovery');switched.t.cloud.user=user;switched.t.cloud.hooks.recovery(user);switched.t.cloud.status='synced';switched.t.cloud.hooks.status();let releasePassword;switched.delayPassword(new Promise(r=>releasePassword=r));const changing=switched.t.accountSubmit(form('account-password-form',{password:'a longer password phrase'}));await Promise.resolve();const other={id:'another-user'};switched.t.cloud.user=other;switched.t.cloud.hooks.recovery(other);releasePassword();await changing;assert.equal(switched.t.state().step,'password');
 console.log('PASS: in-flight duplicate protection, verified reset clears stale login cooldown, switched recovery is not overwritten by an older response');
 const slow=context('#type=recovery');let releaseBudget,readStarted=false;const budgetGate=new Promise(r=>releaseBudget=r),slowUser={id:'slow-budget-user',email:'test@example.invalid'};
 slow.t.cloud.ready=false;slow.t.cloud.status='loading';
 slow.client.auth.onAuthStateChange=fn=>fn('PASSWORD_RECOVERY',{user:slowUser});slow.client.auth.getSession=async()=>({data:{session:{user:slowUser}}});
 slow.client.from=()=>({select(){return this},eq(){return this},async maybeSingle(){readStarted=true;await budgetGate;return {data:null}}});
 const opening=slow.t.cloud.init();for(let i=0;i<20&&!readStarted;i++)await Promise.resolve();assert(readStarted);assert.equal(slow.t.cloud.ready,true);assert.equal(slow.t.cloud.status,'loading');assert.match(slow.node('#page').innerHTML,/id="account-password-form"/);
 releaseBudget();await opening;assert.equal(slow.t.state().step,'password');
 console.log('PASS: early PASSWORD_RECOVERY opens the verified password form while the budget read is still pending');
 console.log('ALL RECOVERY CHECKS PASSED');
}
main().catch(e=>{console.error(e);process.exitCode=1});
