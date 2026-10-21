import webpush from 'npm:web-push@3.6.7';
import {createHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// The privileged key stays in the function's runtime environment.
async function rest(path:string,method='GET',body?:unknown,prefer='return=representation'){
  const response=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json',prefer},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Database request failed');
  return response.status===204?null:response.json();
}
const filter=(value:string)=>encodeURIComponent(value);
const ledger=(device:string,key:string,claim:string)=>'clair_push_deliveries?device_id=eq.'+filter(device)+'&occurrence_key=eq.'+filter(key)+'&claim_id=eq.'+filter(claim);
const db={
  config:async()=>{const rows=await rest('clair_push_config?select=*&id=eq.true');if(!rows[0])throw Error('Service not configured');return rows[0];},
  initKeys:async(keys:{publicKey:string,privateKey:string})=>rest('clair_push_config?id=eq.true&public_key=is.null','PATCH',{public_key:keys.publicKey,private_key:keys.privateKey}),
  devices:async()=>{const rows=[];for(let offset=0;;offset+=500){const page=await rest('clair_push_devices?enabled=eq.true&select=*&order=device_id&limit=500&offset='+offset);rows.push(...page);if(page.length<500)break;}return rows;},
  device:async(id:string)=>(await rest('clair_push_devices?device_id=eq.'+filter(id)+'&select=*'))[0]||null,
  deviceCount:async(uid:string)=>(await rest('clair_push_devices?user_id=eq.'+filter(uid)+'&enabled=eq.true&select=device_id')).length,
  budget:async(uid:string)=>(await rest('clair_budgets?user_id=eq.'+filter(uid)+'&select=payload'))[0]?.payload,
  subscribe:async(value:unknown)=>rest('clair_push_devices?on_conflict=device_id','POST',value,'resolution=merge-duplicates,return=representation'),
  disable:async(id:string)=>rest('clair_push_devices?device_id=eq.'+filter(id),'PATCH',{enabled:false}),
  claim:async(device:string,key:string,claim:string)=>rest('rpc/clair_claim_push','POST',{p_device_id:device,p_occurrence_key:key,p_claim_id:claim}),
  complete:async(device:string,key:string,claim:string)=>rest(ledger(device,key,claim),'PATCH',{sent_at:new Date().toISOString()}),
  release:async(device:string,key:string,claim:string)=>rest(ledger(device,key,claim),'PATCH',{lease_until:new Date().toISOString()})
};
const authenticate=async(header:string)=>{
  if(!/^Bearer [A-Za-z0-9_.-]+$/.test(header))return null;
  const response=await fetch(url+'/auth/v1/user',{headers:{apikey:serviceKey,authorization:header},signal:AbortSignal.timeout(15000)});
  if(!response.ok)return null;const user=await response.json();return user?.id?{id:user.id}:null;
};
Deno.serve(createHandler({db,authenticate,generateKeys:()=>webpush.generateVAPIDKeys(),send:(subscription:unknown,payload:unknown,c:{public_key:string,private_key:string})=>webpush.sendNotification(subscription,JSON.stringify(payload),{TTL:3600,urgency:'normal',timeout:8000,vapidDetails:{subject:'https://j2947djt9g-sketch.github.io/mon-djai/clair/',publicKey:c.public_key,privateKey:c.private_key}})}));
