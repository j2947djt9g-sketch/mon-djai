const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function context(storage=new Map(),initialTime=Date.now(),hash='',search=''){
 const nodes=new Map(),requests=[],replies=[];let clock=initialTime,observeRequest=null;
 const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},disabled:false,open:false,showModal(){this.open=true},close(){this.open=false},addEventListener(){},scrollIntoView(){},focus(){}});return nodes.get(s)};
 const query=s=>{
  if(['#account-form','#account-forgot-form','#account-password-form','#account-loading','#account-confirmation-form','#account-confirmation-resend'].includes(s)&&!node('#page').innerHTML.includes('id="'+s.slice(1)+'"'))return null;
  if(s==='#account-form input[name="email"]'&&!node('#page').innerHTML.includes('id="account-form"'))return null;
  return node(s);
 };
 const client={auth:{signInWithPassword:async p=>{requests.push(p);observeRequest?.();return replies.shift()},signUp:async p=>{requests.push(p);return replies.shift()},resend:async p=>{requests.push({resend:p});return replies.shift()},resetPasswordForEmail:async()=>({}),updateUser:async()=>({})}};
 const DateMock=class extends Date{static now(){return clock}};
 const sandbox={Intl,Date:DateMock,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{origin:'https://example.test',protocol:'https:',href:'https://example.test/clair/'+search+hash,pathname:'/clair/',hash,search},history:{replaceState(){sandbox.location.hash=''}},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:query,addEventListener(){}},supabase:{createClient:()=>client},CLAIR_ACCOUNT_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'},FormData:class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}}};
 sandbox.window=sandbox;sandbox.addEventListener=()=>{};
 vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts.find(code=>code.includes('root.ClairCloud')),sandbox);vm.runInContext(fs.readFileSync(__dirname+'/auth-email.js','utf8'),sandbox);
 let ui=scripts.find(code=>code.includes('function accountSubmit('));
 ui=ui.replace(/  \/\* ---------- Compte et synchronisation ---------- \*\/[\s\S]*?(?=  \/\* ---------- Apparence ---------- \*\/)/,fs.readFileSync(__dirname+'/account-ui.js','utf8')+'\n');
 const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 ui=ui.slice(0,boot)+'window.test={cloud,render,accountGate,accountCard,accountSubmit,accountAction,accountStatus,legacyBudget,transferLegacy,updateLoginButtons,accountConfirmationActive,accountConfirmationView,updateConfirmationButtons,confirmation:()=>accountConfirmation,setData(d){data=d},getData(){return data;}};})();';vm.runInContext(ui,sandbox);const t=sandbox.test;
 t.cloud.ready=true;t.cloud.status='signed-out';
 const form={id:'account-form',dataset:{mode:'login'},values:{email:'a@example.test',password:'wrong'},querySelector:()=>node('#submit'),reset(){}};
 return {t,sandbox,node,requests,replies,storage,form,nextAuthRequest:()=>new Promise(resolve=>{observeRequest=()=>{observeRequest=null;resolve()}}),now:()=>clock,advance:ms=>clock+=ms,error:()=>node('#account-error').textContent,wrong:()=>{replies.push({data:{session:null,user:null},error:{code:'invalid_credentials',status:400}});return t.accountSubmit(form)}};
}
function checkAmbiguousConfirmationCallbacks(){
 const hash='#type=signup&access_token=ACCOUNT-B&refresh_token=REFRESH-B';
 const oldA={id:'cached-account-a',email:'a@example.test',email_confirmed_at:'2026-11-13'};
 for(const [fragment,search] of [
   [hash,'?auth=confirmation&access_token='],
   [hash+'&access_token=','?auth=confirmation'],
   [hash,'?auth=confirmation&refresh_token='],
   [hash,'?auth=confirmation&access_token=FIRST&access_token=']
 ]){
   const cached=context(new Map(),Date.now(),fragment,search);cached.t.cloud.user=oldA;cached.t.cloud.status='synced';
   cached.t.cloud.hooks.authInitialized({error:null,session:{user:oldA}});cached.t.cloud.hooks.status();
   assert.equal(cached.t.confirmation().step,'expired','Empty effective SDK credentials must never confirm cached account A');
   assert.doesNotMatch(cached.t.accountConfirmationView(),/est confirmée/);assert.equal(cached.requests.length,0);
 }
 const merged=context(new Map(),Date.now(),'#type=signup&refresh_token=REFRESH-B','?auth=confirmation&access_token=ACCOUNT-B');
 merged.t.cloud.user=oldA;merged.t.cloud.hooks.authInitialized({error:null,session:{user:oldA}});merged.t.cloud.hooks.status();
 assert.equal(merged.t.confirmation().step,'done','The helper recognizes effective credentials merged across hash and query');
 console.log('PASS ambiguous or empty effective SDK callback credentials cannot confirm cached account A');
}
async function checkSuspendedSignin(){
 const suspended=context();suspended.replies.push({data:{session:null,user:null},error:{code:'user_banned',status:403}});
 await suspended.t.accountSubmit(suspended.form);
 assert.match(suspended.error(),/compte est suspendu/i);assert.match(suspended.error(),/administrateur/);assert.match(suspended.error(),/rétablissement/);
 assert.equal(suspended.t.accountConfirmationActive(),false);assert.equal(suspended.node('#submit').disabled,false);
 assert.equal(suspended.requests.length,1);assert(![...suspended.storage.keys()].some(key=>key.startsWith('clair-login-attempts-v2-')),'Suspension must not count as an incorrect password');
 await suspended.wrong();assert.match(suspended.error(),/2 essais/,'invalid_credentials keeps its existing retry counter');
 console.log('PASS suspended signin explains administrator restoration without confirmation or failed-password count');
}
(async()=>{
 if(process.argv.includes('--ambiguous-callback-only')){checkAmbiguousConfirmationCallbacks();return;}
 if(process.argv.includes('--suspension-only')){await checkSuspendedSignin();return;}
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
 let unlock;b.replies.push(new Promise(resolve=>{unlock=resolve}));const authEntered=b.nextAuthRequest();const pending=b.t.accountSubmit(b.form);await b.t.accountSubmit(b.form);
 // Native SHA-256 may finish after any number of event-loop turns under load.
 // Observe entry into Auth directly while its reply remains held by unlock.
 await Promise.race([authEntered,pending.then(()=>{throw Error('Login completed before reaching Auth')})]);assert.equal(b.requests.length,6,'Concurrent submit must not duplicate Auth calls');
 unlock({data:{session:null,user:null},error:{code:'invalid_credentials',status:400}});await pending;assert.match(b.error(),/1 essai/);
 b.t.cloud.attach=async()=>{};b.replies.push({data:{session:{user:{id:'u',email:'a@example.test'}},user:{id:'u',email:'a@example.test'}},error:null});await b.t.accountSubmit(b.form);
 await b.wrong();assert.match(b.error(),/2 essais/,'Successful login resets consecutive failures');
 console.log('PASS confirmation/provider errors are not wrong passwords, duplicate submissions are prevented and success resets the counter');


 const d=context();d.t.render();await d.wrong();await d.wrong();await d.wrong();
 d.node('#account-form').dataset.mode='login';d.node('#account-form').querySelector=selector=>selector.startsWith('input')?{value:'a@example.test'}:d.node('#submit');
 d.advance(3600000);d.t.updateLoginButtons();assert.equal(d.node('#submit').disabled,false);assert.doesNotMatch(d.error(),/une heure/,'Expiry must clear stale lock wording');
 const offline=context();offline.sandbox.navigator.onLine=false;await offline.wrong();assert.equal(offline.requests.length,0);offline.sandbox.navigator.onLine=true;await offline.wrong();assert.match(offline.error(),/2 essais/);
 const corrupt=context();await corrupt.wrong();const key=[...corrupt.storage.keys()].find(k=>k.startsWith('clair-login-attempts-v2-'));corrupt.storage.set(key,'broken JSON');const fresh=context(corrupt.storage,corrupt.now());await fresh.wrong();assert.match(fresh.error(),/2 essais/);
 const unavailable=context();unavailable.sandbox.localStorage.getItem=()=>{throw Error('storage unavailable')};unavailable.sandbox.localStorage.setItem=()=>{throw Error('storage unavailable')};await unavailable.wrong();await unavailable.wrong();await unavailable.wrong();await unavailable.wrong();assert.equal(unavailable.requests.length,3);
 console.log('PASS expired UI is restored; offline/malformed/unavailable storage do not create a one-error lock');


 const originalTab=context();await originalTab.wrong();await originalTab.wrong();await originalTab.wrong();
 const recoveryTab=context(originalTab.storage,originalTab.now()),recoveredUser={id:'account-a',email:'a@example.test'};
 recoveryTab.t.cloud.user=recoveredUser;recoveryTab.t.cloud.hooks.recovery(recoveredUser);recoveryTab.t.render();
 await recoveryTab.t.accountSubmit({id:'account-password-form',dataset:{},values:{password:'new long password phrase'},querySelector:()=>({disabled:false})});
 assert(![...originalTab.storage.keys()].some(k=>k.startsWith('clair-login-attempts-v2-')),'Verified recovery clears the shared retry key');
 await originalTab.wrong();assert.equal(originalTab.requests.length,4,'Verified recovery in another tab must clear this tab’s cached pause');assert.match(originalTab.error(),/2 essais/);
 const readOnlyStorage=context();readOnlyStorage.sandbox.localStorage.setItem=()=>{throw Error('quota exceeded')};await readOnlyStorage.wrong();await readOnlyStorage.wrong();await readOnlyStorage.wrong();await readOnlyStorage.wrong();assert.equal(readOnlyStorage.requests.length,3,'Write-only storage failures must keep the memory guard');
 console.log('PASS verified recovery clears a second tab pause; failed storage writes keep an in-memory pause');

 const c=context();await c.t.accountAction('account-mode');c.replies.push({data:{session:null,user:{}}});c.form.dataset.mode='signup';c.form.values={email:'a@example.test',password:'twelve-character-password',displayName:'  El-Hadj  '};await c.t.accountSubmit(c.form);
 assert.equal(c.requests.at(-1).options.data.display_name,'El-Hadj');const confirmation=c.t.accountConfirmationView();assert.match(confirmation,/confirmation/);assert.match(confirmation,/clique/i);assert.match(confirmation,/indésirables/);
 c.t.cloud.user={id:'user-a',email:'a@example.test'};c.t.cloud.displayName='<img src=x onerror=alert(1)>';assert(c.t.accountCard().includes('&lt;img'));assert(!c.t.accountCard().includes('<img src=x'));
 c.storage.set('clair-local-owner-v1','user-b');assert.equal(c.t.legacyBudget(),null);
 console.log('PASS signup confirmation gives link/spam instructions, escaped profile text and local budget ownership');

 const e=context();e.replies.push({data:{session:null,user:null},error:{code:'email_not_confirmed',status:400}});await e.t.accountSubmit(e.form);
 assert(e.t.accountConfirmationActive());assert.match(e.t.accountConfirmationView(),/a@example.test/);assert.doesNotMatch(e.t.accountConfirmationView(),/administrateur/);
 await e.t.accountAction('account-confirmation-edit');assert.match(e.t.accountGate(),/data-mode="login"/);assert.match(e.t.accountGate(),/value="a@example.test"/);
 c.t.cloud.user=null;await c.t.accountAction('account-confirmation-edit');assert.match(c.t.accountGate(),/data-mode="signup"/);assert.match(c.t.accountGate(),/name="password"[^>]*value=""/);
 console.log('PASS confirmation correction preserves origin and clears password');

 const sent=context();sent.form.dataset.mode='signup';sent.form.values={email:'<user>@example.test',password:'twelve-character-password',displayName:'Clair'};
 sent.replies.push({data:{session:null,user:{identities:[]}},error:null});await sent.t.accountSubmit(sent.form);
 assert.match(sent.t.accountConfirmationView(),/&lt;user&gt;@example.test/);assert.match(sent.t.accountConfirmationView(),/demande a été acceptée/);assert.doesNotMatch(sent.t.accountConfirmationView(),/e-mail a été envoyé/i);
 assert.equal(sent.node('#account-confirmation-resend').disabled,true);await sent.t.accountAction('account-confirmation-resend');assert.equal(sent.requests.length,1,'Signup starts the cooldown without a second signup');
 sent.advance(60000);sent.replies.push({error:{status:429,code:'over_email_send_rate_limit'}});await sent.t.accountAction('account-confirmation-resend');
 assert.equal(sent.requests.length,2);assert.equal(sent.requests[1].resend.type,'signup');assert.equal(sent.t.confirmation().accepted,false);assert.doesNotMatch(sent.t.accountConfirmationView(),/demande a été acceptée/);
 assert.equal(sent.node('#account-confirmation-resend').disabled,true);
 sent.advance(60000);let releaseConfirmation;sent.replies.push(new Promise(resolve=>{releaseConfirmation=resolve}));const resend=sent.t.accountAction('account-confirmation-resend');
 for(let i=0;i<30&&sent.requests.length<3;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.requests.length,3);await sent.t.accountAction('account-confirmation-resend');assert.equal(sent.requests.length,3);releaseConfirmation({error:null});await resend;
 assert.equal(sent.t.confirmation().accepted,true);assert.match(sent.t.accountConfirmationView(),/demande a été acceptée/);
 const reload=context(sent.storage,sent.now());reload.replies.push({data:{session:null,user:null},error:{code:'email_not_confirmed'}});reload.form.values.email='<user>@example.test';await reload.t.accountSubmit(reload.form);assert.equal(reload.node('#account-confirmation-resend').disabled,true,'Cooldown survives reload');
 assert(![...sent.storage.values()].some(value=>value.includes('<user>')||value.includes('twelve-character-password')));
 console.log('PASS obfuscated signup stays neutral, resend never signs up again, provider failure clears acceptance, cooldown/reload and duplicate protection');
 const callback='#type=signup&access_token=test-access&refresh_token=test-refresh';
 const confirmed=context(new Map(),Date.now(),callback);confirmed.t.cloud.ready=false;confirmed.t.cloud.user={id:'verified-user',email_confirmed_at:'2026-11-13'};
 confirmed.t.cloud.hooks.authInitialized({error:null,session:{user:confirmed.t.cloud.user}});assert.equal(confirmed.t.confirmation().step,'checking');
 confirmed.t.cloud.ready=true;confirmed.t.cloud.hooks.status();assert.equal(confirmed.t.confirmation().step,'done');
 confirmed.t.cloud.user={id:'switched-user',email_confirmed_at:'2026-11-13'};confirmed.t.cloud.hooks.status();assert.equal(confirmed.t.confirmation().step,'expired');
 for(const [hash,outcome] of [
   [callback,{error:{code:'otp_expired'},session:{user:{id:'old-a',email_confirmed_at:'2026-11-13'}}}],
   [callback,{error:null,session:{user:{id:'old-a'}}}],
   ['#type=signup&token_hash=unsupported',{error:null,session:{user:{id:'old-a',email_confirmed_at:'2026-11-13'}}}],
   ['#type=signup&error_code=otp_expired',{error:null,session:{user:{id:'old-a',email_confirmed_at:'2026-11-13'}}}]
 ]){
   const invalid=context(new Map(),Date.now(),hash);invalid.t.cloud.user=outcome.session.user;invalid.t.cloud.hooks.authInitialized(outcome);invalid.t.cloud.hooks.status();assert.equal(invalid.t.confirmation().step,'expired');assert.doesNotMatch(invalid.t.accountConfirmationView(),/est confirmée/);
 }
 const unknown=context(new Map(),Date.now(),'#error_code=otp_expired');assert.equal(unknown.t.confirmation().step,'unknown');assert.match(unknown.t.accountConfirmationView(),/Confirmer mon adresse/);assert.match(unknown.t.accountConfirmationView(),/Récupérer mon mot de passe/);assert.doesNotMatch(unknown.t.accountConfirmationView(),/administrateur/);
 console.log('PASS confirmation callback waits for cloud.ready, matches verified user, rejects invalid/stale sessions and preserves ambiguous link choice');
 checkAmbiguousConfirmationCallbacks();
 await checkSuspendedSignin();
 console.log('ALL ACCOUNT UI CHECKS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});