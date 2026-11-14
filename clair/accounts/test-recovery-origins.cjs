// Local-only contracts: no provider, account, or email calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const services=[['account-help','createHelpHandler','apikey,content-type'],['account-recovery','createRecoveryHandler','apikey,content-type'],['device-unlock','createUnlockHandler','apikey,authorization,content-type']];
 for(const [name,factory,headers] of services){
  const module=await import(`../../supabase/functions/clair-${name}/handler.mjs`);
  const handler=module[factory]({apiKeys:['test'],submit:()=>{throw Error('unexpected submission')},claim:()=>{throw Error('unexpected quota')},send:()=>{throw Error('unexpected mail')},db:{},auth:{}});
  for(const origin of ['https://clair-budget.vercel.app','https://j2947djt9g-sketch.github.io','http://localhost','http://localhost:5173','http://127.0.0.1:8000',undefined]){
   const response=await handler(new Request('https://example.invalid',{method:'OPTIONS',headers:origin?{origin}:{}}));
   assert.equal(response.status,204,`${name} allows ${origin}`);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin||null);assert.equal(response.headers.get('Access-Control-Allow-Headers'),headers);assert.equal(response.headers.get('Vary'),'Origin');
  }
  for(const origin of ['https://evil.invalid','https://clair-budget-preview.vercel.app','https://clair-budget.vercel.app.evil.invalid','https://evil.clair-budget.vercel.app','https://clair-budget.vercel.app:444','https://user@clair-budget.vercel.app','http://clair-budget.vercel.app','http://localhost.evil.invalid','null']){
   const response=await handler(new Request('https://example.invalid',{method:'OPTIONS',headers:{origin}}));assert.equal(response.status,403,`${name} refuses ${origin}`);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  }
 }
 const entry=fs.readFileSync(require.resolve('../../supabase/functions/clair-account-recovery/index.ts'),'utf8');
 assert.match(entry,/import \{createRecoverySender\} from '\.\/sender\.mjs'/);assert.match(entry,/send:createRecoverySender\(\{base,anon\}\)/);
 const {createRecoverySender}=await import('../../supabase/functions/clair-account-recovery/sender.mjs');
 let sent;
 const sender=createRecoverySender({base:'https://provider.invalid',anon:'fixture-key',fetch:async(...args)=>{sent=args;return {status:200}}});
 assert.deepEqual(await sender('person@example.invalid'),{status:200});
 const url=new URL(sent[0]);assert.equal(url.origin,'https://provider.invalid');assert.equal(url.pathname,'/auth/v1/recover');assert.equal(url.searchParams.get('redirect_to'),'https://clair-budget.vercel.app/clair/');assert.equal(sent[1].headers.apikey,'fixture-key');assert.deepEqual(JSON.parse(sent[1].body),{email:'person@example.invalid'});
 const elements=new Map();const $=selector=>{if(!elements.has(selector))elements.set(selector,{value:' Person@Example.invalid ',reportValidity:()=>true});return elements.get(selector)};
 let redirect,options;
 vm.runInNewContext(fs.readFileSync(require.resolve('./reset-page.js'),'utf8'),{document:{querySelector:$},location:{hash:'',pathname:'/clair/reset.html',search:''},history:{},URLSearchParams,sessionStorage:{},supabase:{createClient:(_url,_key,opts)=>{options=opts;return {auth:{getSession:async()=>({data:{session:null}}),resetPasswordForEmail:async(email,opts)=>{assert.equal(email,'person@example.invalid');redirect=opts.redirectTo;return {}}}}}}});
 await $('#reset-resend').onclick({currentTarget:{}});assert.equal(redirect,url.searchParams.get('redirect_to'));assert.equal(options.auth.detectSessionInUrl,false);assert.equal(options.auth.storageKey,'clair-assisted-recovery-session-v1');
 console.log('PASS recovery origins: three OPTIONS policies, hostile origins denied, server destination and standalone reset resend match Vercel; local doubles only');
})().catch(error=>{console.error(error);process.exitCode=1});
