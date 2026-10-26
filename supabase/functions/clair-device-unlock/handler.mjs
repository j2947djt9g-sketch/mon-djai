const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
export async function hashSecret(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function createUnlockHandler({db,auth,fingerprint}){
 return async req=>{
  const origin=req.headers.get('origin'),allowed=!origin||origin==='https://j2947djt9g-sketch.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,authorization,content-type',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{})};
  const answer=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed)return answer({error:'Origine refusée.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return answer({error:'Méthode refusée.'},405);
  try{
   const raw=await req.text();if(raw.length>2048)return answer({error:'Demande trop longue.'},413);
   let input;try{input=JSON.parse(raw);}catch{return answer({error:'Demande invalide.'},400);}
   if(!input||!uuid(input.id)||typeof input.secret!=='string'||!/^[a-f0-9]{64}$/.test(input.secret))return answer({error:'Demande invalide.'},400);
   const hash=await hashSecret(input.secret);
   if(input.action==='request'){
    const email=String(input.email||'').trim().toLowerCase(),device=String(input.device||'Cet appareil').trim().slice(0,100);
    if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!device)return answer({error:'Vérifie ton adresse e-mail.'},400);
    if(!await db.request(input.id,email,hash,device,await fingerprint(req)))return answer({error:'Trop de demandes. Réessaie plus tard.'},429);
    return answer({state:'pending'},202);
   }
   if(input.action==='poll'){
    const claim=await db.claim(input.id,hash);
    if(claim?.state!=='ready')return answer({state:claim?.state==='expired'?'expired':'pending'});
    // The capability is checked atomically before generating a credential. It is never stored server-side.
    const recovery=await auth.recovery(claim.email);
    if(!recovery?.hashed_token||!/^[A-Za-z0-9_-]{32,128}$/.test(recovery.hashed_token))throw Error('Recovery unavailable');
    return answer({state:'ready',token_hash:recovery.hashed_token});
   }
   if(input.action==='complete'){
    const user=await auth.user(req.headers.get('authorization')||'');
    if(!user?.id||!user.email_confirmed_at)return answer({error:'Vérification expirée. Rouvre la demande.'},401);
    if(!await db.complete(input.id,hash,user.id))return answer({error:'Demande expirée.'},409);
    return answer({state:'completed'});
   }
   return answer({error:'Action inconnue.'},400);
  }catch{return answer({error:'Le déblocage est indisponible pour le moment. Réessaie dans un instant.'},503);}
 };
}
