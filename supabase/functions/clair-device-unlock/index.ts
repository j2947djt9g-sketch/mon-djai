import {createUnlockHandler} from './handler.mjs';
const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function request(path:string,body:unknown){
 const response=await fetch(base+path,{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Backend refused operation');return response.json();
}
Deno.serve(createUnlockHandler({
 db:{
  request:(id:string,email:string,hash:string,device:string,fingerprint:string)=>request('/rest/v1/rpc/clair_request_device_unlock',{p_id:id,p_email:email,p_hash:hash,p_device:device,p_fingerprint:fingerprint}),
  claim:(id:string,hash:string)=>request('/rest/v1/rpc/clair_claim_device_unlock',{p_id:id,p_hash:hash}),
  complete:(id:string,hash:string,user:string)=>request('/rest/v1/rpc/clair_complete_device_unlock',{p_id:id,p_hash:hash,p_user:user})
 },
 auth:{
  recovery:(email:string)=>request('/auth/v1/admin/generate_link',{type:'recovery',email}),
  user:async(header:string)=>{
   if(!/^Bearer [A-Za-z0-9_.-]+$/.test(header))return null;
   const response=await fetch(base+'/auth/v1/user',{headers:{apikey:key,authorization:header},signal:AbortSignal.timeout(10000)});return response.ok?response.json():null;
  }
 },
 fingerprint:async(req:Request)=>{
  const address=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,200);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'\n'+address));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 }
}));
