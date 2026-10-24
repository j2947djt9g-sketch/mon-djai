export function createHelpHandler({submit,fingerprint}){
 return async req=>{
  const origin=req.headers.get('origin');
  const allowed=!origin||origin==='https://j2947djt9g-sketch.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,content-type',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{})};
  const answer=(body,status)=>new Response(JSON.stringify(body),{status,headers});
  const ok=()=>answer({ok:true,message:'Ta demande a été prise en compte. L’administrateur pourra te guider pour retrouver ton compte.'},202);
  if(!allowed)return answer({error:'Origine refusée.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return answer({error:'Méthode refusée.'},405);
  try{
   const raw=await req.text();if(raw.length>2048)return answer({error:'Demande trop longue.'},413);
   let input;try{input=JSON.parse(raw);}catch{return answer({error:'Demande invalide.'},400);}
   if(!input||typeof input!=='object')return answer({error:'Demande invalide.'},400);
   if(input.website)return ok();
   const email=String(input.email||'').trim().toLowerCase();
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return answer({error:'Vérifie ton adresse e-mail.'},400);
   if(!['email_missing','link_expired','access_problem'].includes(input.reason))return answer({error:'Choisis le problème rencontré.'},400);
   const accepted=await submit(email,input.reason,await fingerprint(req));
   return accepted?ok():answer({error:'Trop de demandes. Réessaie plus tard.'},429);
  }catch{return answer({error:'La demande n’a pas pu être transmise. Réessaie.'},503);}
 };
}
