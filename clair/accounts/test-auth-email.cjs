/* Pure auth-email contracts. No network or real accounts. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {webcrypto}=require('crypto');
const sourcePath=__dirname+'/auth-email.js';
const tests=[];
function test(name,run){tests.push({name,run});}
function load(extra={}){
 const window={};Object.defineProperties(window,Object.getOwnPropertyDescriptors(extra));
 const context={window,URL,URLSearchParams,TextEncoder,Date,Uint8Array};vm.createContext(context);
 if(fs.existsSync(sourcePath))vm.runInContext(fs.readFileSync(sourcePath,'utf8'),context);
 return window.ClairAuthEmail;
}
function storage(){const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
function setup(api=load(),store=storage(),project='project-a'){
 let time=100000,requests=[];
 const auth={url:'https://'+project+'.supabase.co/auth/v1',signUp:async input=>({data:{user:{identities:[]},session:null},error:null}),resend:async input=>{requests.push(input);return {data:{user:null,session:null},error:null};}};
 return {api,store,auth,requests,advance:n=>{time+=n},create:()=>api.create({auth,storage:store,crypto:webcrypto,now:()=>time})};
}
function plain(value){return JSON.parse(JSON.stringify(value));}
function assertError(result,code){assert.equal(result.accepted,false);assert.equal(result.error.code,code);assert.equal(typeof result.error.message,'string');}
const canonical='https://clair-budget.vercel.app/clair/?auth=confirmation';
test('global exports the confirmation service',()=>{assert.ok(load(),'ClairAuthEmail is available');});
test('email normalization and canonical redirects ignore the current origin',()=>{
 for(const href of ['https://clair-budget.vercel.app/clair/','https://someone.github.io/mon-djai/clair/index.html','https://untrusted-preview.example/clair/?next=https://evil.test']){
  const api=load({location:new URL(href)});assert.equal(api.normalizeEmail('  Alice@Example.TEST \n'),'alice@example.test');assert.equal(api.normalizeEmail(null),'');assert.equal(api.confirmationRedirect(),canonical);
 }
});
test('callback keeps confirmation, recovery, unknown and ordinary navigation distinct',()=>{
 const api=load();
 const fixtures=[
  ['',null,false,false],['?auth=confirmation','confirmation',false,false],
  ['#access_token=secret&refresh_token=refresh&type=signup','confirmation',false,true],
  ['?auth=confirmation#error=access_denied&error_code=otp_expired','confirmation',true,false],
  ['#type=recovery&error_code=otp_expired&error=access_denied','recovery',true,false],
  ['#error=access_denied&error_code=otp_expired','unknown',true,false],
  ['?code=secret','unknown',false,true],['#access_token=secret','unknown',false,true],
  ['?auth=confirmation#type=recovery&access_token=secret','unknown',false,true],
  ['#type=magiclink&access_token=secret','unknown',false,true],['?type=report#section',null,false,false],
  ['?auth=confirmation#type=signup&access_token=secret','confirmation',false,true]
 ];
 for(const [suffix,kind,hasError,hasCredentials] of fixtures){const result=api.callback(new URL('https://app.test/clair/'+suffix));assert.equal(result.kind,kind,suffix);assert.equal(result.hasError,hasError,suffix);assert.equal(result.hasCredentials,hasCredentials,suffix);}
 assert.equal(api.callback(new URL('https://app.test/#error_code=otp_expired')).errorCode,'otp_expired');
 assert.equal(api.callback(new URL('https://app.test/#error_code=%3Cscript%3E')).errorCode,null);
});
test('implicit credentials follow SDK hash then query priority including empty and repeated values',()=>{
 const api=load();
 const fixtures=[
  ['',false],
  ['?auth=confirmation#type=signup&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation&access_token=#type=signup&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE',false],
  ['?auth=confirmation&refresh_token=#type=signup&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE',false],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE&access_token=&refresh_token=REFRESH-FIXTURE',false],
  ['?auth=confirmation&access_token=&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE&refresh_token=',false],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE&refresh_token=&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation#type=signup&access_token=ACCESS-FIXTURE&access_token=&refresh_token=REFRESH-FIXTURE',false],
  ['?auth=confirmation#type=signup&access_token=&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation#type=signup&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE&refresh_token=',false],
  ['?auth=confirmation#type=signup&access_token=ACCESS-FIXTURE&refresh_token=&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE#type=signup&access_token=&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation&refresh_token=REFRESH-FIXTURE#type=signup&access_token=ACCESS-FIXTURE&refresh_token=',true],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE#type=signup&refresh_token=REFRESH-FIXTURE',true],
  ['?auth=confirmation&code=CODE-FIXTURE',false],
  ['?auth=confirmation#token_hash=HASH-FIXTURE',false],
  ['?auth=confirmation&access_token=ACCESS-FIXTURE',false],
  ['?auth=confirmation&refresh_token=REFRESH-FIXTURE',false]
 ];
 for(const [suffix,expected] of fixtures){
  const result=api.callback(new URL('https://app.test/clair/'+suffix));
  assert.equal(result.hasImplicitCredentials,expected,suffix);
  assert(!JSON.stringify(result).includes('FIXTURE'),'callback returns no credentials');
 }
 const ambiguous=api.callback(new URL('https://app.test/clair/?auth=confirmation&access_token=#type=signup&access_token=ACCESS-FIXTURE&refresh_token=REFRESH-FIXTURE'));
 assert.equal(ambiguous.kind,'confirmation');assert.equal(ambiguous.hasCredentials,true,'legacy broad credential detection remains compatible');
});
test('cleanup is explicit, removes auth material and preserves unrelated URL and history state',()=>{
 const api=load(),location=new URL('https://app.test/clair/?tab=profile&auth=confirmation&code=secret&utm_source=mail#type=signup&access_token=secret&refresh_token=secret&expires_in=3600&view=wide');
 let replaced;const state={panel:'profile'},history={state,replaceState:(s,title,url)=>{replaced={s,title,url};}};
 api.callback(location);assert.equal(replaced,undefined,'inspection must not consume the SDK callback');
 api.cleanCallback(location,history);assert.equal(replaced.url,'/clair/?tab=profile&utm_source=mail#view=wide');assert.equal(replaced.s,state);
 replaced=null;api.cleanCallback(new URL('https://app.test/clair/?type=report#section'),history);assert.equal(replaced,null);
 api.cleanCallback(new URL('https://app.test/clair/?auth=confirmation#section'),history);assert.equal(replaced.url,'/clair/#section');
 api.cleanCallback(new URL('https://app.test/clair/?auth=confirmation&type=report&tab=profile#access_token=secret&view=wide'),history);assert.equal(replaced.url,'/clair/?type=report&tab=profile#view=wide');
});
test('all provider messages are French and never disclose arbitrary provider details',()=>{
 const api=load();for(const error of [{message:'<script>secret token alice@example.test</script>'},{code:'otp_expired'},{status:429},{code:'email_not_confirmed'},{code:'provider_disabled'},{code:'confirmation_cooldown',waitSeconds:42},null]){const result=api.message(error);assert.equal(typeof result,'string');assert(!/script|secret|token|alice@|provider_disabled/.test(result));assert(/[éèêàôûîç]|confirmation|connexion|patient|demande/i.test(result));}
});
test('signup delegates normalized inputs and returns the raw SDK result without treating obfuscation as delivery',async()=>{
 const s=setup(),controller=s.create();const raw={data:{user:{identities:[]},session:null},error:null};let got;
 s.auth.signUp=async input=>{got=input;return raw};assert.equal(await controller.signup({email:' Alice@Example.TEST ',password:'private-password',displayName:'Alice'}),raw);
 assert.deepEqual(plain(got),{email:'alice@example.test',password:'private-password',options:{emailRedirectTo:canonical,data:{display_name:'Alice'}}});
 await controller.prepare('alice@example.test');assert.equal(controller.waitSeconds('alice@example.test'),0);assert.equal(s.store.data.size,0);
});
test('markRequested is synchronous to read after preparation and persists only a project/email SHA256 deadline',async()=>{
 const s=setup(),controller=s.create();await controller.prepare(' Alice@Example.TEST ');assert.equal(controller.waitSeconds('alice@example.test'),0);
 await controller.markRequested('Alice@Example.TEST');assert.equal(controller.waitSeconds('alice@example.test'),60);
 const entries=[...s.store.data];assert.equal(entries.length,1);assert.match(entries[0][0],/^clair-auth-email-v1-[a-f0-9]{64}$/);assert.equal(entries[0][1],'160000');
 const secretDump=JSON.stringify(entries);assert(!secretDump.includes('alice'));assert(!secretDump.includes('project-a'));
 s.advance(59001);assert.equal(controller.waitSeconds('alice@example.test'),1);s.advance(999);assert.equal(controller.waitSeconds('alice@example.test'),0);
});
test('resend starts sixty seconds at request time and accepts only a successful SDK response',async()=>{
 const s=setup(),controller=s.create();assert.deepEqual(plain(await controller.resend(' Alice@Example.TEST ')),{accepted:true,error:null});assert.deepEqual(plain(s.requests),[{type:'signup',email:'alice@example.test',options:{emailRedirectTo:canonical}}]);
 const blocked=await controller.resend('alice@example.test');assertError(blocked,'confirmation_cooldown');assert.equal(blocked.error.waitSeconds,60);assert.equal(s.requests.length,1);
 s.advance(60000);assert.deepEqual(plain(await controller.resend('alice@example.test')),{accepted:true,error:null});assert.equal(s.requests.length,2);
});
test('cooldowns survive reload, cross-controller access and are isolated by email and project',async()=>{
 const s=setup(),first=s.create(),second=s.create();await second.prepare('alice@example.test');await first.resend('alice@example.test');assert.equal(second.waitSeconds('alice@example.test'),60);
 const reload=setup(load(),s.store),restored=reload.create();await restored.prepare('alice@example.test');assert.equal(restored.waitSeconds('alice@example.test'),60);
 await restored.prepare('bob@example.test');assert.equal(restored.waitSeconds('bob@example.test'),0);
 const other=setup(load(),s.store,'project-b'),different=other.create();await different.prepare('alice@example.test');assert.equal(different.waitSeconds('alice@example.test'),0);
});
test('a cooldown written by another page is re-read after preparation',async()=>{
 const s=setup(),controller=s.create();await controller.prepare('alice@example.test');
 const another=setup(load(),s.store),writer=another.create();await writer.markRequested('alice@example.test');assert.equal(controller.waitSeconds('alice@example.test'),60);
});
test('corrupt cooldown values cannot block future requests indefinitely',async()=>{
 for(const stored of ['invalid','-1','999999999999999999999']){
  const s=setup(),first=s.create();await first.markRequested('alice@example.test');const key=[...s.store.data.keys()][0];s.store.setItem(key,stored);
  const reload=setup(load(),s.store),restored=reload.create();await restored.prepare('alice@example.test');assert.equal(restored.waitSeconds('alice@example.test'),0);assert.deepEqual(plain(await restored.resend('alice@example.test')),{accepted:true,error:null});
 }
});
test('global pending-request guard blocks double clicks and another controller/email until settlement',async()=>{
 const s=setup(),first=s.create(),second=s.create();let release;s.auth.resend=()=>new Promise(resolve=>{release=resolve});
 const pending=first.resend('alice@example.test');assertError(await first.resend('alice@example.test'),'request_in_progress');assertError(await second.resend('bob@example.test'),'request_in_progress');
 while(!release)await new Promise(resolve=>setImmediate(resolve));assert.equal(first.waitSeconds('alice@example.test'),60);s.advance(60000);assertError(await second.resend('bob@example.test'),'request_in_progress');
 release({error:null});assert.deepEqual(plain(await pending),{accepted:true,error:null});
 s.auth.resend=async()=>({error:null});assert.deepEqual(plain(await second.resend('bob@example.test')),{accepted:true,error:null});
});
test('429, provider failures, malformed responses and thrown network errors retain cooldown without success',async()=>{
 for(const response of [{error:{status:429,code:'over_email_send_rate_limit',message:'secret'}},{error:{code:'provider_disabled',message:'secret'}},{},null,new Error('secret network token')]){
  const s=setup(),controller=s.create();s.auth.resend=async()=>{if(response instanceof Error)throw response;return response;};
  const result=await controller.resend('alice@example.test');assert(result.error);assert.equal(result.accepted,false);assert(!JSON.stringify(result).includes('secret'));assert.equal(controller.waitSeconds('alice@example.test'),60);assertError(await controller.resend('alice@example.test'),'confirmation_cooldown');
 }
});
test('storage denial and missing or rejecting crypto fall back to shared memory with no plaintext writes',async()=>{
 for(const crypto of [null,{subtle:{digest:async()=>{throw Error('blocked')}}},webcrypto]){
  const api=load();let writes=0;const store={getItem(){throw Error('blocked')},setItem(){writes++;throw Error('blocked')}};let time=100000;
  const auth={url:'https://fallback.supabase.co/auth/v1',resend:async()=>({error:null})};const opts={auth,storage:store,crypto,now:()=>time};const first=api.create(opts),second=api.create(opts);
  assert.deepEqual(plain(await first.resend('alice@example.test')),{accepted:true,error:null});await second.prepare('alice@example.test');assert.equal(second.waitSeconds('alice@example.test'),60);assertError(await second.resend('alice@example.test'),'confirmation_cooldown');
  if(!crypto||crypto!==webcrypto)assert.equal(writes,0);time+=60000;assert.equal(first.waitSeconds('alice@example.test'),0);
 }
 const blocked={};Object.defineProperty(blocked,'localStorage',{get(){throw Error('SecurityError')}});Object.defineProperty(blocked,'crypto',{get(){throw Error('SecurityError')}});
 const api=load(blocked);assert.deepEqual(plain(await api.create({auth:{resend:async()=>({error:null})}}).resend('alice@example.test')),{accepted:true,error:null});
});
(async()=>{let failed=0;for(const {name,run} of tests){try{await run();console.log('PASS: '+name)}catch(error){failed++;console.error('FAIL: '+name);console.error(error.stack)}}console.log(`${tests.length-failed}/${tests.length} auth-email tests passed`);if(failed)process.exitCode=1;})();
