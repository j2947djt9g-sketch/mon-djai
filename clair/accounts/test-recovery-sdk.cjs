const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const uid='8450886d-891a-40e2-995e-ea46bb1409bc';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'sdk-test@example.invalid',user_metadata:{display_name:'Test'},app_metadata:{provider:'email'},identities:[]};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),iss:'https://hkssnbvktfscizojhftl.supabase.co/auth/v1'},'TEST-SIGNATURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
const initial=new URL('https://example.test/clair/#access_token='+jwt+'&refresh_token=TEST-REFRESH&expires_in=3600&expires_at='+String(Math.floor(Date.now()/1000)+3600)+'&token_type=bearer&type=recovery');
const storage=new Map(),nodes=new Map(),calls=[];
let releaseBudget,budgetRequested=false;const budgetGate=new Promise(resolve=>releaseBudget=resolve);
function node(s){if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,showModal(){this.open=true},close(){this.open=false},focus(){},scrollIntoView(){},addEventListener(){}});return nodes.get(s)}
const controls=new Set(['#account-forgot-form','#account-password-form','#account-reset-send','#account-reset-resend']);
const s={Intl,Date,TextEncoder,TextDecoder,URL,URLSearchParams,Blob,Headers,Request,Response,structuredClone,crypto,console,AbortController,setTimeout,clearTimeout,setInterval,clearInterval,
 location:{origin:initial.origin,pathname:initial.pathname,protocol:initial.protocol,search:initial.search,hash:initial.hash,href:initial.href},
 history:{replaceState(_state,_title,url){const next=new URL(url,initial);Object.assign(s.location,{hash:next.hash,href:next.href,search:next.search})}},
 navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 document:{visibilityState:'visible',documentElement:{dataset:{}},body:{dataset:{}},querySelector:selector=>controls.has(selector)&&!node('#page').innerHTML.includes('id="'+selector.slice(1)+'"')?null:node(selector),addEventListener(){},removeEventListener(){}},
 FormData:class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}},
 fetch:async(url,options={})=>{
   const target=new URL(url instanceof Request?url.url:url),method=options.method||'GET';calls.push({path:target.pathname,method});
   if(target.pathname==='/auth/v1/user')return new Response(JSON.stringify(user),{status:200,headers:{'content-type':'application/json'}});
   if(target.pathname==='/auth/v1/logout')return new Response('{}',{status:200});
   if(target.pathname==='/rest/v1/rpc/clair_account_active')return new Response('true',{status:200,headers:{'content-type':'application/json'}});
   if(target.pathname==='/rest/v1/clair_budgets'){budgetRequested=true;await budgetGate;const payload=s.ClairEngine.empty();payload.initialized=payload.setupDone=true;payload.openingCents=1700;return new Response(JSON.stringify({payload,revision:1,operation_id:'sdk-operation',display_name:'Test'}),{status:200,headers:{'content-type':'application/json'}})}
   throw Error('Unexpected API path '+target.pathname);
 }};
s.window=s;s.globalThis=s;s.addEventListener=()=>{};s.removeEventListener=()=>{};
vm.createContext(s);for(let i=0;i<3;i++)vm.runInContext(scripts[i],s);
const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');
vm.runInContext(scripts[3].slice(0,boot)+'window.test={cloud,render,accountSubmit,accountAction,state:()=>accountResetStep};})();',s);
async function main(){
 const t=s.test,opening=t.cloud.init();
 for(let n=0;n<50&&!node('#page').innerHTML.includes('account-password-form');n++)await new Promise(r=>setTimeout(r,10));
 assert.equal(t.cloud.user.id,uid);assert.equal(t.state(),'password');assert(node('#page').innerHTML.includes('account-password-form'));assert.equal(s.location.hash,'');
 await new Promise(resolve=>setImmediate(resolve));assert(budgetRequested);assert.equal(t.cloud.status,'loading');assert.equal(t.cloud.ready,true);
 await t.accountSubmit({id:'account-password-form',values:{password:'test recovery long phrase'},querySelector:()=>({disabled:false})});
 assert.equal(t.state(),'done');assert(calls.some(c=>c.path==='/auth/v1/user'&&c.method==='PUT'));
 releaseBudget();await opening;assert.equal(t.state(),'done');
 await t.accountAction('account-reset-finish');assert.equal(t.state(),null);assert.match(node('#page').innerHTML,/17,00/);
 console.log('PASS official Supabase JS 2.102.0: URL consumed, validated recovery form and password update before slow budget load, late sync preserves success, original budget return (mock transport)');
 await t.cloud.client.auth.stopAutoRefresh();
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});

