import {createHelpHandler} from './handler.mjs';
const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
Deno.serve(createHelpHandler({
 fingerprint:async(req:Request)=>{
  const address=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,200);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'\n'+address));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 },
 submit:async(email:string,reason:string,fingerprint:string)=>{
  const res=await fetch(base+'/rest/v1/rpc/clair_request_account_help',{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({p_email:email,p_reason:reason,p_fingerprint:fingerprint}),signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('Request failed');return res.json();
 }
}));
