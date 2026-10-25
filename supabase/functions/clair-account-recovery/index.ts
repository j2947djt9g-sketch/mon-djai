import {createRecoveryHandler} from './handler.mjs';
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey='sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||publicKey;
const timeout=()=>AbortSignal.timeout(12000);
const secret=await crypto.subtle.importKey('raw',new TextEncoder().encode(service),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const digest=async(value:string)=>[...new Uint8Array(await crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(createRecoveryHandler({
 apiKeys:[publicKey,anon],
 fingerprint:async(req:Request,email:string)=>({recipient:await digest('email:'+email),address:await digest('ip:'+(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,200))}),
 claim:async(recipient:string,address:string)=>{
  const res=await fetch(base+'/rest/v1/rpc/clair_claim_recovery_request',{method:'POST',headers:{apikey:service,authorization:'Bearer '+service,'content-type':'application/json'},body:JSON.stringify({p_recipient:recipient,p_fingerprint:address}),signal:timeout()});
  if(!res.ok)throw Error('Quota unavailable');return res.json();
 },
 send:async(email:string)=>{
  const url=new URL(base+'/auth/v1/recover');url.searchParams.set('redirect_to','https://j2947djt9g-sketch.github.io/mon-djai/clair/');
  const res=await fetch(url,{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email}),signal:timeout()});
  return {status:res.status};
 }
}));
