const assert=require('node:assert/strict');
(async()=>{
 const {createUnlockAdapters}=await import('../../supabase/functions/clair-device-unlock/adapters.mjs');
 const uid='22222222-2222-4222-8222-222222222222',email='member@example.invalid',token='b'.repeat(64);
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 async function run(preflight,generate){const calls=[];const adapter=createUnlockAdapters({base:'https://auth.example.invalid',key:'fixture-key',fetchImpl:async(url,options)=>{calls.push({url,options});return calls.length===1?preflight():generate();}});return {result:await adapter.auth.issueRecovery({email,expectedUserId:uid}),calls};}
 for(const preflight of [()=>{throw Error('timeout');},()=>json({},503),()=>json({id:uid,email:'reassigned@example.invalid'}),()=>json({id:'wrong',email}),()=>new Response('{')]){
  const r=await run(preflight,()=>{throw Error('must not generate');});assert.deepEqual(r.result,{kind:'not_issued',reason:'local_preflight'});assert.equal(r.calls.length,1);
 }
 for(const generate of [()=>{throw Error('timeout');},()=>json({error:'rejected'},400),()=>json({},500),()=>new Response('{'),()=>json({hashed_token:token}),()=>json({id:'wrong',hashed_token:token}),()=>json({id:uid,hashed_token:'bad'}),()=>json({user:{id:uid},properties:{hashed_token:token}})]){
  const r=await run(()=>json({id:uid,email}),generate);assert.equal(r.result.kind,'unknown');assert(!JSON.stringify(r.result).includes(token));assert.equal(r.calls.length,2);
 }
 const good=await run(()=>json({id:uid,email}),()=>json({id:uid,email,hashed_token:token,action_link:'https://example.invalid/secret'}));assert.deepEqual(good.result,{kind:'issued',tokenHash:token,userId:uid});
 assert.equal(good.calls[0].url,'https://auth.example.invalid/auth/v1/admin/users/'+uid);assert.equal(good.calls[0].options.method,'GET');
 assert.equal(good.calls[1].url,'https://auth.example.invalid/auth/v1/admin/generate_link');assert.deepEqual(JSON.parse(good.calls[1].options.body),{type:'recovery',email});
 const rpcCalls=[];const {db}=createUnlockAdapters({base:'https://auth.example.invalid',key:'fixture-key',fetchImpl:async(url,options)=>{rpcCalls.push([url,JSON.parse(options.body)]);return json(true);}});
 await db.reserve(uid,'hash');await db.dispatch(uid,'hash',uid);await db.finish(uid,'hash',uid,'unknown');
 assert.deepEqual(rpcCalls.map(x=>x[0].split('/').pop()),['clair_reserve_device_unlock_v2','clair_dispatch_device_unlock_v2','clair_finish_device_unlock_v2']);assert.equal(rpcCalls[2][1].p_outcome,'unknown');
 let attempts=0;const broken=createUnlockAdapters({base:'https://auth.example.invalid',key:'fixture-key',fetchImpl:async()=>{attempts++;throw Error('lost');}});await assert.rejects(broken.db.dispatch(uid,'hash',uid));assert.equal(attempts,1);
 console.log('PASS adapters: preflight, raw REST owner identity, unclassified HTTP/transport/malformed closure, no retry and versioned RPC mapping');
})().catch(e=>{console.error(e);process.exitCode=1;});
