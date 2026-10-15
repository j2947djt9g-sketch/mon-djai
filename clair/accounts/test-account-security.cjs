const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function context(){
 const nodes=new Map(),storage=new Map(),calls={signup:[],verify:[],update:[],signout:[],reauth:0,clients:[]};
 let signupReply={data:{session:null,user:{identities:[]}}},verifyError=null,passwordError=null,clock=Date.now(),verifyWait=null;
 const user={id:'account-a',email:'a@example.invalid'},date=class extends Date{static now(){return clock}};
 const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'',type:'password',style:{},dataset:{},open:false,hidden:false,resetCount:0,showModal(){this.open=true},close(){this.open=false},addEventListener(){},scrollIntoView(){},focus(){},setAttribute(k,v){this[k]=v},reset(){this.resetCount++;this.values={}},querySelector:()=>({disabled:false}),querySelectorAll:()=>['currentPassword','password','passwordConfirm'].map(name=>node('#change-'+name))});return nodes.get(key)};
 function query(key){
  if(key==='#account-form input[name="email"]')return node('#page').innerHTML.includes('id="account-form"')?node(key):null;
  if(['#account-form','#account-loading','#account-forgot-form','#account-password-form'].includes(key)&&!node('#page').innerHTML.includes('id="'+key.slice(1)+'"'))return null;
  return node(key);
 }
 const client={auth:{signUp:async args=>{calls.signup.push(args);return signupReply},updateUser:async args=>{calls.update.push(args);return {error:passwordError}},reauthenticate:async()=>{calls.reauth++;return {error:null}},resetPasswordForEmail:async()=>({error:null})}};
 const verifier={auth:{signInWithPassword:async args=>{calls.verify.push(args);if(verifyWait)await verifyWait;return {data:verifyError?null:{user,session:{user}},error:verifyError}},signOut:async args=>{calls.signout.push(args);return {error:null}}}};
 const s={Intl,Date:date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{origin:'https://example.test',protocol:'https:',pathname:'/clair/',href:'https://example.test/clair/',hash:'',search:''},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:query,addEventListener(){}},supabase:{createClient:(url,key,options)=>{calls.clients.push(options);return options.auth.persistSession===false?verifier:client}},CLAIR_ACCOUNT_CONFIG:{url:'https://test.supabase.co',key:'sb_publishable_test'},FormData:class{constructor(form){this.values=form.values}get(key){return this.values[key]??null}}};
 s.window=s;s.addEventListener=()=>{};vm.createContext(s);vm.runInContext(scripts[0],s);vm.runInContext(scripts[2],s);
 const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');
 vm.runInContext(scripts[3].slice(0,boot)+'window.test={cloud,render,accountGate,accountCard,accountAction,accountSubmit,close,setData:d=>{data=d},getData:()=>data,state:()=>({mode:accountMode,email:accountResetEmail,step:accountResetStep})};})();',s);
 const t=s.test;t.cloud.ready=true;t.cloud.status='signed-out';
 return {s,t,node,calls,storage,user,connect(){t.cloud.user=user;t.cloud.status='synced';const d=s.ClairEngine.empty();d.initialized=d.setupDone=true;d.openingCents=1700;t.setData(d)},signupReply:x=>signupReply=x,verifyError:x=>verifyError=x,passwordError:x=>passwordError=x,advance:ms=>clock+=ms,delayVerify:p=>verifyWait=p};
}
const form=(id,values)=>({id,dataset:{mode:'signup'},values,reset(){this.resetCount=(this.resetCount||0)+1},querySelector:()=>({disabled:false})});
const values={currentPassword:'current password phrase',password:'new long password phrase',passwordConfirm:'new long password phrase'};
async function main(){
 for(const reply of [{error:{code:'user_already_exists'}},{error:{code:'email_exists'}},{data:{session:null,user:{identities:[]}}},{data:{session:null,user:{identities:[{id:'new'}]}}}]){
  const a=context();await a.t.accountAction('account-mode');a.signupReply(reply);await a.t.accountSubmit(form('account-form',{email:'  A@EXAMPLE.INVALID ',password:'long password phrase',displayName:'A'}));
  const view=a.t.accountGate();assert.match(view,/data-action="account-login"/);assert.match(view,/data-action="account-forgot"/);assert.match(view,/a@example.invalid/);assert.doesNotMatch(view,/id="account-form"/);
  if(reply.error)assert.match(view,/déjà associée/);else{assert.match(view,/Si cette adresse/);assert.doesNotMatch(view,/adresse e-mail est déjà associée/)}
  assert.equal(a.calls.signup[0].email,'a@example.invalid');assert.equal(a.calls.update.length,0);
  await a.t.accountAction('account-login');assert.equal(a.t.state().mode,'login');assert.match(a.t.accountGate(),/value="a@example.invalid"/);
  await a.t.accountAction('account-forgot');assert.equal(a.t.state().email,'a@example.invalid');assert.equal(a.t.state().step,'email');
 }
 console.log('PASS duplicate, obscured and new signup responses: login/recovery options, normalized retained email, honest account-existence wording');
 const a=context();a.connect();const before=JSON.stringify(a.t.getData());assert.match(a.t.accountCard(),/Modifier mon mot de passe/);await a.t.accountAction('account-change-password');const change=form('account-change-password-form',{...values});
 for(const patch of [{password:'short',passwordConfirm:'short'},{passwordConfirm:'different long phrase'},{currentPassword:''},{password:values.currentPassword,passwordConfirm:values.currentPassword}]){change.values={...values,...patch};await a.t.accountSubmit(change);assert.equal(a.calls.verify.length,0);assert.equal(a.calls.update.length,0);assert(a.node('#form-error').textContent.length>0)}
 change.values={...values};a.verifyError({code:'invalid_credentials'});await a.t.accountSubmit(change);assert.equal(a.calls.update.length,0);assert.match(a.node('#form-error').textContent,/actuel est incorrect/);assert.equal(a.node('#dialog').open,true);
 a.verifyError(null);a.passwordError({code:'weak_password'});await a.t.accountSubmit(change);assert.equal(a.node('#dialog').open,true);assert.match(a.node('#form-error').textContent,/facile à deviner/);
 const fields=a.node('#account-change-password-form').querySelectorAll();await a.t.accountAction('account-change-toggle');assert(fields.every(f=>f.type==='text'));await a.t.accountAction('account-change-toggle');assert(fields.every(f=>f.type==='password'));
 a.node('#account-change-password-form input[name="password"]').value='still editing';a.t.cloud.hooks.status();a.t.cloud.hooks.apply(a.t.getData(),JSON.stringify(a.t.getData()));assert.equal(a.node('#account-change-password-form input[name="password"]').value,'still editing');assert.equal(a.node('#dialog').open,true);
 a.passwordError(null);await a.t.accountSubmit(change);assert.match(a.node('#dialog').innerHTML,/Ton nouveau mot de passe est enregistré/);assert.equal(a.node('#dialog').open,true);assert.equal(change.resetCount,1);
 assert.equal(a.calls.update.at(-1).current_password,values.currentPassword);assert(a.calls.signout.every(x=>x.scope==='local'));assert(a.calls.clients.slice(1).every(x=>x.auth.persistSession===false&&x.auth.autoRefreshToken===false&&x.auth.detectSessionInUrl===false));assert.equal(JSON.stringify(a.t.getData()),before);assert(![...a.storage.values()].some(x=>x.includes(values.password)||x.includes(values.currentPassword)));
 console.log('PASS password validation, isolated server verification, errors/retry, visibility, unchanged budget, no stored secrets and persistent success');
 const b=context();b.connect();await b.t.accountAction('account-change-password');const codeForm=form('account-change-password-form',{...values});b.passwordError({code:'reauthentication_needed'});await b.t.accountSubmit(codeForm);assert.equal(b.calls.reauth,1);assert.equal(b.node('#account-change-verification').hidden,false);assert.equal(b.node('#account-change-password-form input[name="nonce"]').required,true);
 await b.t.accountSubmit(codeForm);assert.equal(b.calls.update.length,1);assert.match(b.node('#form-error').textContent,/code de vérification/);await b.t.accountAction('account-change-resend');assert.equal(b.calls.reauth,1);b.advance(61000);await b.t.accountAction('account-change-resend');assert.equal(b.calls.reauth,2);
 codeForm.values.nonce='123456';b.passwordError({code:'reauthentication_not_valid'});await b.t.accountSubmit(codeForm);assert.match(b.node('#form-error').textContent,/incorrect ou expiré/);b.passwordError(null);await b.t.accountSubmit(codeForm);assert.equal(b.calls.update.at(-1).nonce,'123456');assert.match(b.node('#dialog').innerHTML,/Mot de passe modifié/);
 console.log('PASS optional reauthentication, resend delay, invalid code and retry');
 const c=context();c.connect();await c.t.accountAction('account-change-password');c.s.navigator.onLine=false;await c.t.accountSubmit(form('account-change-password-form',values));assert.equal(c.calls.verify.length,0);assert.equal(c.calls.update.length,0);
 c.s.navigator.onLine=true;let resolve;c.delayVerify(new Promise(r=>resolve=r));const pending=c.t.accountSubmit(form('account-change-password-form',values));await Promise.resolve();c.t.close();resolve();await pending;assert.equal(c.calls.update.length,0);await c.t.accountAction('account-change-password');c.t.cloud.user={id:'account-b'};await c.t.accountSubmit(form('account-change-password-form',values));assert.equal(c.calls.update.length,0);
 console.log('PASS offline, cancellation during verification and changed account block modification');
}
main().catch(error=>{console.error(error);process.exitCode=1});
