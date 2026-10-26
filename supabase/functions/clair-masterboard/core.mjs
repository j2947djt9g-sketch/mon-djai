export const APP_URL='https://j2947djt9g-sketch.github.io/mon-djai/clair/';
export const parisDate=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function dueState(until,today=parisDate()){
  if(!until)return {label:'Sans échéance de test',due:false};
  const days=Math.round((Date.parse(until+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
  return {days,due:days<=2,label:days<0?'Test expiré':days===0?'Test à échéance':days<=2?'Test à relancer':'Test actif'};
}
export function messageFor(user,settings,until,kind='reminder'){
  const name=String(user.name||'').replace(/[\r\n\u0000-\u001f]/g,' ').slice(0,64);
  if(kind==='recovery')return {
    subject:'Clair — récupérer ton compte',
    body:`Bonjour${name?' '+name:''},\n\nPour retrouver ton compte Clair, ouvre ${APP_URL} puis choisis « Mot de passe oublié » et utilise cette adresse e-mail. Ton historique reste conservé.\n\nSi le lien de récupération n’arrive pas, vérifie tes courriers indésirables puis réponds à ce message.\n\nEl-Hadj — Clair`
  };
  return {
    subject:'[TEST] Clair — rappel d’abonnement à 1,99 €',
    body:`Bonjour${name?' '+name:''},\n\nCeci est un test du futur rappel d’abonnement Clair. Aucun paiement n’est dû : Clair reste gratuit jusqu’à une annonce explicite. Ne transfère pas d’argent pour ce test.\n\nMontant simulé : 1,99 € pour un mois.\nÉchéance simulée : ${until||'non définie'}.\nRéférence : CLAIR-${user.id.slice(0,8).toUpperCase()}.${settings.payment_phone?'\nCoordonnées Wero pour tester le message : '+settings.payment_phone:''}\n\nTu peux répondre « Test reçu » pour confirmer la réception.\n\nEl-Hadj — Clair`
  };
}
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,msg)=>{throw new HttpError(status,msg);};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
export function createHandler({db,auth,now=()=>new Date()}){
  return async req=>{
    const origin=req.headers.get('origin');
    const allowed=!origin||origin==='https://j2947djt9g-sketch.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
    const answer=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    try{
      if(!allowed)fail(403,'Origine refusée.');
      if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(req.method!=='POST')fail(405,'Méthode refusée.');
      const actor=await auth.user(req.headers.get('authorization')||'');
      if(!actor||!actor.email_confirmed_at||Date.parse(actor.banned_until||'')>+now())fail(401,'Reconnecte-toi.');
      if(!await db.isAdmin(actor.id))fail(403,'Ce compte ne peut pas ouvrir le masterboard.');
      const raw=await req.text();if(raw.length>4096)fail(413,'Requête trop grande.');
      let input;try{input=JSON.parse(raw);}catch{fail(400,'Requête invalide.');}
      if(!input||typeof input!=='object')fail(400,'Requête invalide.');
      const action=input.action;
      if(action==='snapshot'){
        const [users,settings,subscriptions,messages,audit,admins,profiles,requests]=await Promise.all([auth.users(),db.settings(),db.subscriptions(),db.messages(),db.audit(),db.admins(),db.profiles(),db.helpRequests?.()||[]]);
        return answer({actor:{id:actor.id,email:actor.email},settings:{...settings,mode:'free'},today:parisDate(now()),users:users.map(u=>({id:u.id,email:u.email||'',name:profiles.find(p=>p.user_id===u.id)?.display_name||'',confirmed:!!u.email_confirmed_at,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,banned:Date.parse(u.banned_until||'')>+now(),is_admin:admins.includes(u.id),test_until:subscriptions.find(s=>s.user_id===u.id)?.test_until||null})),messages,audit,requests});
      }
      if(action==='close-help'){
        if(!uuid(input.id))fail(400,'Demande invalide.');
        await db.closeHelp(input.id);await db.log(actor.id,null,'help_request_closed');return answer({ok:true});
      }
      if(action==='settings'){
        const phone=String(input.payment_phone||'').trim();
        if(phone.length>40||!/^[+\d ().-]*$/.test(phone))fail(400,'Numéro Wero invalide.');
        await db.saveSettings(phone);await db.log(actor.id,null,'test_settings_saved');return answer({ok:true});
      }
      if(['get-mail','mail-opened','mail-confirm'].includes(action)){
        if(!uuid(input.id))fail(400,'Message invalide.');
        const mail=await db.message(input.id);if(!mail||mail.actor_id!==actor.id)fail(404,'Message introuvable.');
        if(action==='get-mail')return answer({message:mail});
        if(action==='mail-confirm'&&mail.state==='prepared')fail(409,'Ouvre d’abord le message dans ta messagerie.');
        const state=action==='mail-confirm'?'confirmed_sent':mail.state==='confirmed_sent'?'confirmed_sent':'opened';
        await db.updateMessage(mail.id,state,now().toISOString());return answer({ok:true});
      }
      if(!uuid(input.user_id))fail(400,'Compte invalide.');
      const target=await auth.target(input.user_id);if(!target)fail(404,'Compte introuvable.');
      if(action==='authorize-reset'){
        if(String(input.confirm_email||'').trim().toLowerCase()!==target.email.toLowerCase())fail(400,'L’adresse recopiée ne correspond pas au compte sélectionné.');
        if(target.id===actor.id)fail(409,'Pour ton propre compte administrateur, utilise la récupération de compte.');
        const signedIn=Date.parse(actor.last_sign_in_at||'');
        if(!Number.isFinite(signedIn)||+now()-signedIn>900000)fail(409,'Reconnecte-toi au masterboard avant cette action sensible.');
        if(Date.parse(target.banned_until||'')>+now())fail(409,'Ce compte est suspendu. Rétablis son accès séparément si nécessaire.');
        if(!uuid(input.request_id))fail(400,'La personne doit d’abord demander le déblocage depuis son application Clair.');
        const request=await db.unlockRequest(input.request_id);
        if(!request||request.email.toLowerCase()!==target.email.toLowerCase()||Date.parse(request.expires_at)<=+now()||!['pending','approving'].includes(request.status))fail(409,'Cette demande est expirée ou déjà traitée. La personne doit en envoyer une nouvelle depuis son appareil.');
        if(!await db.beginUnlock(input.request_id,actor.id,target.id,target.email))fail(429,'Cette demande est déjà en cours. Attends une minute avant de recommencer.');
        let invalidated=false;
        try{
          await auth.invalidatePassword(target.id);invalidated=true;
          await db.approveUnlock(input.request_id,new Date(+now()+900000).toISOString());
        }catch{
          if(invalidated)fail(503,'L’ancien mot de passe est désactivé, mais le déblocage n’a pas pu être terminé. Attends une minute puis réessaie.');
          fail(503,'Le mot de passe n’a pas pu être désactivé. Attends une minute puis réessaie.');
        }
        await db.log(actor.id,target.id,'device_unlock_approved');
        return answer({ok:true,device_label:request.device_label});
      }
      if(action==='prepare-mail'){
        if(!uuid(input.id)||!['reminder','recovery'].includes(input.kind))fail(400,'Message invalide.');
        const existing=await db.message(input.id);
        if(existing){if(existing.actor_id!==actor.id||existing.user_id!==target.id)fail(409,'Référence déjà utilisée.');return answer({message:existing});}
        if(await db.recentMailCount(target.id,now())>=5)fail(429,'Cinq messages ont déjà été préparés pour ce compte dans les dernières 24 h.');
        const settings=await db.settings(),sub=await db.subscription(target.id),profiles=await db.profiles();
        const msg=messageFor({...target,name:profiles.find(p=>p.user_id===target.id)?.display_name},settings,sub?.test_until,input.kind);
        const row={id:input.id,user_id:target.id,actor_id:actor.id,email:target.email,...msg,kind:input.kind,state:'prepared'};
        await db.insertMessage(row);return answer({message:row});
      }
      if(action==='renew-test')return answer({ok:true,test_until:await db.renew(actor.id,target.id,parisDate(now()))});
      if(action==='set-test-date'){
        const date=input.date;
        if(typeof date!=='string'||!/^20\d\d-\d\d-\d\d$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail(400,'Date invalide.');
        await db.setTestDate(target.id,date);await db.log(actor.id,target.id,'test_date_changed');return answer({ok:true});
      }
      if(['suspend','restore','delete'].includes(action)){
        if(await db.isAdmin(target.id))fail(409,'Le compte administrateur est protégé.');
        if(String(input.confirm_email||'').trim().toLowerCase()!==target.email.toLowerCase())fail(400,'Recopie exactement l’adresse du compte.');
        if(!actor.last_sign_in_at||+now()-Date.parse(actor.last_sign_in_at)>15*60*1000)fail(409,'Reconnecte-toi au masterboard avant cette action sensible.');
        // Audit intent survives deletion; completion is logged separately and never claims success early.
        await db.log(actor.id,target.id,action+'_requested');
        if(action==='delete')await auth.remove(target.id);
        else {await auth.ban(target.id,action==='suspend');if(action==='suspend')await db.disableDevices(target.id);}
        await db.log(actor.id,action==='delete'?null:target.id,action+'_completed');return answer({ok:true});
      }
      fail(400,'Action inconnue.');
    }catch(e){return answer({error:e instanceof HttpError?e.message:'Opération indisponible. Aucune réussite n’est confirmée ; actualise avant de réessayer.'},e instanceof HttpError?e.status:500);}
  };
}
