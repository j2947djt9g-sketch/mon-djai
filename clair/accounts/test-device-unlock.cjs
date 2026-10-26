const assert=require('node:assert/strict');
(async()=>{
 const {createUnlockHandler,hashSecret}=await import('../../supabase/functions/clair-device-unlock/handler.mjs');
 const {createPasswordResetAdmin}=await import('../../supabase/functions/clair-masterboard/password-reset.mjs');
 const id='33333333-3333-4333-8333-333333333333',secret='a'.repeat(64),uid='22222222-2222-4222-8222-222222222222';
 let row=null,generated=0,completed=0,actor=null,requests=0;
 const db={
  request:async(i,email,hash,device,ip)=>{requests++;row={id:i,email,hash,device,state:'pending'};assert.notEqual(hash,secret);assert.equal(ip,'ip-hash');return true;},
  claim:async(i,hash)=>{if(!row||row.id!==i||row.hash!==hash)return {state:'expired'};if(row.state==='approved'){row.state='issued';return {state:'ready',email:row.email,user_id:uid};}return {state:row.state==='pending'?'pending':'expired'};},
  complete:async(i,hash,user)=>{if(!row||row.id!==i||row.hash!==hash||user!==uid||row.state!=='issued')return false;completed++;row.state='completed';return true;}
 };
 const handler=createUnlockHandler({db,fingerprint:async()=>'ip-hash',auth:{user:async()=>actor,recovery:async email=>{assert.equal(email,row.email);generated++;return {hashed_token:'b'.repeat(64)};}}});
 const call=async(body,origin='https://j2947djt9g-sketch.github.io')=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin},body:JSON.stringify({id,secret,...body})}));
 assert.equal((await call({action:'request',email:'member@example.invalid',device:'iPhone'},'https://evil.invalid')).status,403);
 assert.equal((await call({action:'request',secret:'bad',email:'member@example.invalid',device:'iPhone'})).status,400);
 assert.equal((await call({action:'request',email:'Member@Example.invalid',device:'iPhone'})).status,202);assert.equal(row.email,'member@example.invalid');assert.equal(requests,1);
 assert.equal((await (await call({action:'poll'})).json()).state,'pending');assert.equal(generated,0);
 row.state='approved';assert.equal((await (await call({action:'poll',secret:'c'.repeat(64)})).json()).state,'expired');assert.equal(generated,0);
 const ready=await call({action:'poll'});assert.equal(ready.headers.get('cache-control'),'no-store');assert.equal((await ready.json()).state,'ready');assert.equal(generated,1);
 assert.equal((await (await call({action:'poll'})).json()).state,'expired');assert.equal(generated,1);
 assert.equal((await call({action:'complete'})).status,401);actor={id:'another-user',email_confirmed_at:'yes'};assert.equal((await call({action:'complete'})).status,409);
 actor={id:uid,email_confirmed_at:'yes'};assert.equal((await call({action:'complete'})).status,200);assert.equal(completed,1);
 assert.equal((await call({action:'complete'})).status,409);assert.equal(await hashSecret(secret),row.hash);
 const calls=[];const transport=createPasswordResetAdmin({request:async(...args)=>calls.push(args)});
 await transport.invalidatePassword(uid);await transport.invalidatePassword(uid);
 assert(calls.every(([path,method,body])=>path==='/auth/v1/admin/users/'+uid&&method==='PUT'&&/^Aa1![a-f0-9]{64}$/.test(body.password)));
 assert.notEqual(calls[0][2].password,calls[1][2].password);assert.equal(Object.keys(calls[0][2]).join(','),'password');
 console.log('PASS device unlock: origin and input checks, hashed device capability, pending approval, wrong-device rejection, atomic single-use issuance, authenticated completion, random password invalidation and no email confirmation override');
})().catch(error=>{console.error(error);process.exitCode=1});
