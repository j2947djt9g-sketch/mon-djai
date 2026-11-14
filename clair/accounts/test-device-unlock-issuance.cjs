const assert=require('node:assert/strict');
(async()=>{
 const {createUnlockHandler,hashSecret}=await import('../../supabase/functions/clair-device-unlock/handler.mjs');
 const {unlockDb}=await import('../../tools/clair/test-support/unlock-db.mjs');
 const id='33333333-3333-4333-8333-333333333333',uid='22222222-2222-4222-8222-222222222222',secret='a'.repeat(64),hash=await hashSecret(secret),token='b'.repeat(64);
 function setup(issue){const state=unlockDb({id,uid,hash});let calls=0,emitted=0;
  const auth={user:async()=>({id:uid,email_confirmed_at:'yes'}),recovery:async()=>{calls++;throw Error('preflight');},issueRecovery:async arg=>{calls++;assert.equal(arg.expectedUserId,uid);return issue({emit:()=>emitted++,state,calls});}};
  const handler=createUnlockHandler({db:state.db,auth,fingerprint:async()=>''});
  const poll=()=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:'https://clair-budget.vercel.app'},body:JSON.stringify({id,secret,action:'poll'})}));
  return {...state,poll,counts:()=>({calls,emitted})};}
 const retry=setup(({calls,emit})=>{if(calls===1)return {kind:'not_issued',reason:'local_preflight'};emit();return {kind:'issued',tokenHash:token,userId:uid};});
 assert.equal((await retry.poll()).status,503);
 assert.equal((await (await retry.poll()).json()).state,'pending','certain preflight failure must retain capacity during backoff');
 retry.advance(5000);assert.equal((await (await retry.poll()).json()).state,'ready');assert.deepEqual(retry.counts(),{calls:2,emitted:1});
 for(const issuedBeforeTimeout of [false,true]){
  const f=setup(({emit})=>{if(issuedBeforeTimeout)emit();throw Error('timeout');});
  assert.equal((await f.poll()).status,503);assert.equal((await (await f.poll()).json()).state,'expired');assert.deepEqual(f.counts(),{calls:1,emitted:Number(issuedBeforeTimeout)});
 }
 for(const result of [{kind:'unknown'},{kind:'issued',tokenHash:token,userId:'wrong'},{kind:'issued',tokenHash:'bad',userId:uid}]){
  const f=setup(()=>result);const res=await f.poll();assert.equal(res.status,503);assert(!JSON.stringify(await res.json()).includes(token));assert.equal((await (await f.poll()).json()).state,'expired');
 }
 const concurrent=setup(async({emit})=>{await new Promise(r=>setTimeout(r,10));emit();return {kind:'issued',tokenHash:token,userId:uid};});
 const states=await Promise.all((await Promise.all([concurrent.poll(),concurrent.poll()])).map(async r=>(await r.json()).state));
 assert.deepEqual(states.sort(),['pending','ready']);
 assert.deepEqual(concurrent.counts(),{calls:1,emitted:1});
 for(const method of ['reserve','dispatch','finish']){
  const f=setup(({emit})=>{emit();return {kind:'issued',tokenHash:token,userId:uid};});const original=f.db[method];
  f.db[method]=async(...args)=>{await original(...args);throw Error('reply lost');};
  assert.equal((await f.poll()).status,503);f.db[method]=original;
  if(method==='reserve'){f.advance(30001);assert.equal((await (await f.poll()).json()).state,'ready');assert.equal(f.counts().emitted,1);}
  else {f.advance(30001);assert.equal((await (await f.poll()).json()).state,'expired');assert.equal(f.counts().emitted,method==='finish'?1:0);}
 }
 const late=setup(({emit,state})=>{emit();state.advance(30001);return {kind:'issued',tokenHash:token,userId:uid};});assert.equal((await late.poll()).status,503);assert.equal((await (await late.poll()).json()).state,'expired');
 // Actual admin handler and password adapter, then actual unlock handler and Auth adapter.
 const {createHandler}=await import('../../supabase/functions/clair-masterboard/core.mjs');
 const {createPasswordResetAdmin}=await import('../../supabase/functions/clair-masterboard/password-reset.mjs');
 const {createUnlockAdapters}=await import('../../supabase/functions/clair-device-unlock/adapters.mjs');
 const flow=unlockDb({id,uid,hash});flow.row.status='pending';
 let password='old-password',remoteEmissions=0,owner=uid,actorId=uid;
 const acceptsPassword=value=>value===password;
 const reset=createPasswordResetAdmin({request:async(path,method,body)=>{assert.equal(path,'/auth/v1/admin/users/'+uid);assert.equal(method,'PUT');password=body.password;}});
 const admin='11111111-1111-4111-8111-111111111111',now=new Date();
 const adminHandler=createHandler({now:()=>now,auth:{user:async()=>({id:admin,email_confirmed_at:'yes',last_sign_in_at:now.toISOString()}),target:async()=>({id:uid,email:flow.row.email}),...reset},db:{isAdmin:async()=>true,unlockRequest:async()=>({email:flow.row.email,status:flow.row.status,expires_at:new Date(+now+900000).toISOString()}),beginUnlock:async()=>{flow.row.status='approving';return true;},approveUnlock:async()=>{assert.equal(acceptsPassword('old-password'),false);flow.row.status='approved';},log:async()=>{}}});
 assert.equal(acceptsPassword('old-password'),true);
 const approval=await adminHandler(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({action:'authorize-reset',user_id:uid,request_id:id,confirm_email:flow.row.email})}));assert.equal(approval.status,200);assert.equal(acceptsPassword('old-password'),false);
 const adapters=createUnlockAdapters({base:'https://fixture.invalid',key:'fixture',fetchImpl:async url=>{
  if(url.endsWith('/admin/users/'+uid))return Response.json({id:uid,email:flow.row.email});
  assert(url.endsWith('/admin/generate_link'));remoteEmissions++;return Response.json({id:owner,hashed_token:token});
 }});
 const integrated=createUnlockHandler({db:flow.db,auth:{...adapters.auth,user:async()=>({id:actorId,email_confirmed_at:'yes'})},fingerprint:async()=>''});
 const invoke=action=>integrated(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({id,secret,action})}));
 assert.deepEqual(await (await invoke('poll')).json(),{state:'ready',token_hash:token});assert.equal(remoteEmissions,1);
 assert.equal((await (await invoke('poll')).json()).state,'expired');assert.equal(remoteEmissions,1);
 actorId=admin;assert.equal((await invoke('complete')).status,409);actorId=uid;assert.equal((await invoke('complete')).status,200);assert.equal((await invoke('complete')).status,409);
 // Email reassignment between successful preflight and generation must not disclose the other account's token.
 flow.row.status='approved';flow.row.hash=hash;flow.advance(5000);owner=admin;
 assert.equal((await invoke('poll')).status,503);assert.equal((await (await invoke('poll')).json()).state,'expired');assert.equal(remoteEmissions,2);
 console.log('PASS issuance: safe retry, unknown closure, owner/token checks, concurrent polls, lost RPC replies and late finish');
})().catch(e=>{console.error(e);process.exitCode=1;});
