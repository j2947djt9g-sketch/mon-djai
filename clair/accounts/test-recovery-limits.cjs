// Recovery request transport tests use only fictional addresses and mock senders.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const {createRecoveryHandler}=await import(pathToFileURL(path.resolve(__dirname,'../../supabase/functions/clair-account-recovery/handler.mjs')));
 const mails=[],claims=[];let quota={allowed:true,retry_after:60,remaining_requests:4},status=200;
 const handler=createRecoveryHandler({apiKeys:['public-test'],fingerprint:async(_req,email)=>({recipient:'a'.repeat(64),address:'b'.repeat(64)}),claim:async(a,b)=>{claims.push([a,b]);return quota},send:async email=>{mails.push(email);return {status}}});
 const req=(body,extra={})=>new Request('https://example.invalid/recovery',{method:'POST',headers:{origin:'https://j2947djt9g-sketch.github.io',apikey:'public-test','content-type':'application/json',...extra},body:typeof body==='string'?body:JSON.stringify(body)});
 let res=await handler(req({email:' Person@Example.invalid ',redirect_to:'https://evil.invalid'}));assert.equal(res.status,202);let result=await res.json();assert.equal(mails[0],'person@example.invalid');assert.equal(result.retry_after,60);assert.equal(res.headers.get('Retry-After'),'60');assert(!JSON.stringify(result).includes('person@'));assert.equal(claims.length,1);
 quota={allowed:false,retry_after:1800,code:'recovery_limit'};res=await handler(req({email:'person@example.invalid'}));assert.equal(res.status,429);assert.equal((await res.json()).retry_after,1800);assert.equal(mails.length,1);
 quota={allowed:false,retry_after:33,code:'recovery_wait'};res=await handler(req({email:'person@example.invalid'}));assert.equal(res.status,429);assert.equal(res.headers.get('Retry-After'),'33');assert.equal(mails.length,1);
 quota={allowed:true,retry_after:1800};res=await handler(req({email:'person@example.invalid'}));assert.equal(res.status,202);assert.equal((await res.json()).retry_after,1800);
 status=429;res=await handler(req({email:'person@example.invalid'}));assert.equal(res.status,503);result=await res.json();assert.equal(result.code,'email_service_limited');assert.match(result.error,/administrateur/);
 status=500;res=await handler(req({email:'person@example.invalid'}));assert.equal(res.status,503);assert.equal((await res.json()).code,'email_service_unavailable');
 status=400;res=await handler(req({email:'unknown@example.invalid'}));assert.equal(res.status,202);assert(!JSON.stringify(await res.json()).includes('unknown@'));
 const before=claims.length;assert.equal((await handler(req({email:'bad'}))).status,400);assert.equal((await handler(req('broken'))).status,400);assert.equal((await handler(req('x'.repeat(2049)))).status,413);assert.equal((await handler(req({email:'p@example.invalid'},{apikey:'bad'}))).status,401);assert.equal((await handler(req({email:'p@example.invalid'},{origin:'https://evil.invalid'}))).status,403);assert.equal((await handler(req({email:'bot@example.invalid',website:'spam'}))).status,202);assert.equal(claims.length,before);
 const broken=createRecoveryHandler({apiKeys:['public-test'],fingerprint:async()=>{throw Error('secret')},claim:async()=>{},send:async()=>{throw Error('must not send')}});
 res=await broken(req({email:'p@example.invalid'}));assert.equal(res.status,503);assert(!JSON.stringify(await res.json()).includes('secret'));
 console.log('PASS recovery endpoint: normalized email, quota before send, 5th-request pause, short cooldown, provider limits, neutral unknown-account response, API key/origin/body validation and no leaked credentials');
})().catch(error=>{console.error(error);process.exitCode=1});
