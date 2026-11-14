import {CLAIR_RECOVERY_DESTINATION} from '../_shared/origins.mjs';
// Injectable transport keeps destination generation testable without issuing mail.
export function createRecoverySender({base,anon,fetch:request=globalThis.fetch}){
 return async email=>{
  const url=new URL(base+'/auth/v1/recover');url.searchParams.set('redirect_to',CLAIR_RECOVERY_DESTINATION);
  const res=await request(url,{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email}),signal:AbortSignal.timeout(12000)});
  return {status:res.status};
 };
}
