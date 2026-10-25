export function createRecoveryHandler({claim,send,fingerprint,apiKeys}){
 return async req=>{
  const origin=req.headers.get('origin');
  const allowed=!origin||origin==='https://j2947djt9g-sketch.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Expose-Headers':'Retry-After',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{})};
  const answer=(body,status,retry=0)=>new Response(JSON.stringify(body),{status,headers:{...headers,...(retry?{'Retry-After':String(retry)}:{})}});
  const neutral=wait=>answer({ok:true,retry_after:wait,message:'Si un compte utilise cette adresse, un lien sera envoyé.'},202,wait);
  if(!allowed)return answer({error:'Origine refusée.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return answer({error:'Méthode refusée.'},405);
  if(!apiKeys.includes(req.headers.get('apikey')||''))return answer({error:'Application non reconnue.'},401);
  try{
   const raw=await req.text();if(raw.length>2048)return answer({error:'Demande trop longue.'},413);
   let body;try{body=JSON.parse(raw);}catch{return answer({error:'Demande invalide.'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return answer({error:'Demande invalide.'},400);
   if(body.website)return neutral(60);
   const email=String(body.email||'').trim().toLowerCase();
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return answer({error:'Vérifie ton adresse e-mail.'},400);
   const hashes=await fingerprint(req,email),quota=await claim(hashes.recipient,hashes.address);
   const wait=Math.max(1,Math.min(1800,Math.ceil(Number(quota.retry_after)||60)));
   if(!quota.allowed)return answer({error:quota.code==='recovery_limit'?'Limite de demandes atteinte. Réessaie après la pause de trente minutes.':'Patiente avant de demander un nouveau lien.',code:quota.code,retry_after:wait},429,wait);
   const result=await send(email);
   if(result.status===429)return answer({error:'Le service e-mail a atteint sa limite d’envoi. Contacte l’administrateur pour un déblocage par code.',code:'email_service_limited',retry_after:wait},503,wait);
   if(result.status>=500)return answer({error:'Le service e-mail est indisponible. Contacte l’administrateur ou réessaie plus tard.',code:'email_service_unavailable',retry_after:wait},503,wait);
   // Never confirm account existence or return provider error details or credentials.
   return neutral(wait);
  }catch{return answer({error:'La demande n’a pas pu être transmise. Vérifie ta connexion puis réessaie.',code:'recovery_unavailable'},503);}
 };
}
