const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const uid='8450886d-891a-40e2-995e-ea46bb1409bc',user={id:uid,aud:'authenticated',role:'authenticated',email:'sdk-test@example.invalid',email_confirmed_at:'2026-11-13',user_metadata:{display_name:'Test'},app_metadata:{provider:'email'},identities:[]};
function token(sessionId){return [{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',session_id:sessionId,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),iss:'https://hkssnbvktfscizojhftl.supabase.co/auth/v1'},'TEST-SIGNATURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.')}
const originalToken=token('original'),temporaryToken=token('temporary'),storage=new Map(),nodes=new Map(),calls=[];
storage.set('clair-account-session-v1',JSON.stringify({access_token:originalToken,refresh_token:'TEST-ORIGINAL-REFRESH',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
function node(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,reset(){},showModal(){this.open=true},close(){this.open=false},focus(){},scrollIntoView(){},addEventListener(){}});return nodes.get(key)}
const s={Intl,Date,TextEncoder,TextDecoder,URL,URLSearchParams,Blob,Headers,Request,Response,structuredClone,crypto,console,AbortController,setTimeout,clearTimeout,setInterval:(...args)=>{const timer=setInterval(...args);timer.unref();return timer;},clearInterval,location:{origin:'https://example.test',pathname:'/clair/',protocol:'https:',search:'?auth=confirmation&access_token=',hash:'#type=signup&access_token=OTHER-ACCOUNT-B&refresh_token=B-REFRESH&expires_in=3600&token_type=bearer',href:'https://example.test/clair/?auth=confirmation&access_token=#type=signup&access_token=OTHER-ACCOUNT-B&refresh_token=B-REFRESH&expires_in=3600&token_type=bearer'},history:{state:null,replaceState(){}},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{visibilityState:'visible',documentElement:{dataset:{}},body:{dataset:{}},querySelector:key=>['#account-form','#account-loading'].includes(key)?null:node(key),addEventListener(){},removeEventListener(){}},FormData:class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}},fetch:async(url,options={})=>{
 const target=new URL(url instanceof Request?url.url:url),method=options.method||'GET',body=options.body?JSON.parse(options.body):null,authorization=new Headers(options.headers).get('authorization');calls.push({path:target.pathname,method,body,authorization,query:target.search});
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','x-supabase-api-version':'2024-01-01'}});
 if(target.pathname==='/auth/v1/token')return body.password==='correct current password'?response({access_token:temporaryToken,refresh_token:'TEST-TEMP-REFRESH',expires_in:3600,token_type:'bearer',user}):response({code:'invalid_credentials',msg:'Invalid login credentials'},400);
 if(target.pathname==='/auth/v1/user')return response(user);if(target.pathname==='/auth/v1/logout')return response({});
 if(target.pathname==='/rest/v1/clair_budgets'){const payload=s.ClairEngine.empty();payload.initialized=payload.setupDone=true;payload.openingCents=1700;return response({payload,revision:1,operation_id:'sdk-operation',display_name:'Test'})}throw Error('Unexpected API path '+target.pathname);
}};
s.window=s;s.globalThis=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};vm.createContext(s);for(let i=0;i<3;i++)vm.runInContext(scripts[i],s);const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');vm.runInContext(scripts[3].slice(0,boot)+'window.test={cloud,accountAction,accountSubmit,confirmation:()=>accountConfirmation,getData:()=>data};})();',s);

(async()=>{
 await s.test.cloud.init();
 assert.equal(s.test.cloud.user?.id,uid,'The existing account remains the valid session');
 assert.equal(s.test.confirmation().step,'expired','Empty effective callback credentials must not confirm the cached account');
 assert.equal(calls.filter(c=>c.path==='/auth/v1/user').length,0,'The SDK ignored the malformed callback and did not verify another user');
 assert(!calls.some(c=>c.method!=='GET'),'A malformed confirmation does not write budgets or accounts');
 assert.equal(JSON.parse(storage.get('clair-account-session-v1')).user.id,uid);
 console.log('PASS official SDK confirmation: query overrides hash including empty values; cached account is preserved without a false confirmation or any write');
 await s.test.cloud.client.auth.stopAutoRefresh();
})().catch(error=>{console.error(error);process.exitCode=1});
