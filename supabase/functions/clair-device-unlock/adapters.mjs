// Native fetch deliberately has no retry wrapper. Never persist or log provider responses.
export function createUnlockAdapters({base,key,fetchImpl=fetch}) {
 const headers={apikey:key,authorization:'Bearer '+key,'content-type':'application/json'};
 const request=(path,method,body,timeout=15000)=>fetchImpl(base+path,{method,headers, ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(timeout)});
 async function rpc(name,body){const response=await request('/rest/v1/rpc/'+name,'POST',body);if(!response.ok)throw Error('Backend refused operation');return response.json();}
 return {
  db:{
   request:(id,email,hash,device,fingerprint)=>rpc('clair_request_device_unlock',{p_id:id,p_email:email,p_hash:hash,p_device:device,p_fingerprint:fingerprint}),
   reserve:(id,hash)=>rpc('clair_reserve_device_unlock_v2',{p_id:id,p_hash:hash}),
   dispatch:(id,hash,attempt)=>rpc('clair_dispatch_device_unlock_v2',{p_id:id,p_hash:hash,p_attempt:attempt}),
   finish:(id,hash,attempt,outcome)=>rpc('clair_finish_device_unlock_v2',{p_id:id,p_hash:hash,p_attempt:attempt,p_outcome:outcome}),
   complete:(id,hash,user)=>rpc('clair_complete_device_unlock',{p_id:id,p_hash:hash,p_user:user})
  },
  auth:{
   async issueRecovery({email,expectedUserId}){
    // This read-only preflight cannot issue a credential, including on transport failure.
    try{
     if(typeof expectedUserId!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(expectedUserId)||typeof email!=='string')return {kind:'not_issued',reason:'local_preflight'};
     const response=await request('/auth/v1/admin/users/'+expectedUserId,'GET');
     if(!response.ok)return {kind:'not_issued',reason:'local_preflight'};
     const user=await response.json();
     if(user?.id!==expectedUserId||typeof user.email!=='string'||user.email.toLowerCase()!==email.toLowerCase())return {kind:'not_issued',reason:'local_preflight'};
    }catch{return {kind:'not_issued',reason:'local_preflight'};}
    // From this boundary onwards ALL failures are indeterminate. No HTTP status allowlist.
    try{
     const response=await request('/auth/v1/admin/generate_link','POST',{type:'recovery',email});
     if(!response.ok)return {kind:'unknown',reason:'http_unclassified'};
     const result=await response.json();
     // Native GoTrue REST fields are top-level, unlike the SDK's transformed user/properties envelope.
     if(result?.id!==expectedUserId)return {kind:'unknown',reason:'identity_mismatch'};
     if(typeof result.hashed_token!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(result.hashed_token))return {kind:'unknown',reason:'malformed'};
     return {kind:'issued',tokenHash:result.hashed_token,userId:result.id};
    }catch{return {kind:'unknown',reason:'transport'};}
   },
   async user(header){
    if(!/^Bearer [A-Za-z0-9_.-]+$/.test(header))return null;
    const response=await fetchImpl(base+'/auth/v1/user',{headers:{apikey:key,authorization:header},signal:AbortSignal.timeout(10000)});return response.ok?response.json():null;
   }
  }
 };
}
