(function(){
 'use strict';
 const BASE='https://hkssnbvktfscizojhftl.supabase.co',KEY='sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8',STORE='clair-device-unlock-v1',AUTH='clair-device-unlock-auth-v1';
 if(!window.supabase||!window.crypto?.getRandomValues)return;
 const client=supabase.createClient(BASE,KEY,{auth:{storageKey:AUTH,storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const root=document.querySelector('#device-unlock-root')||document.body.appendChild(Object.assign(document.createElement('dialog'),{id:'device-unlock-dialog'}));
 const inline=root.id==='device-unlock-root';
 const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const $=selector=>root.querySelector(selector);
 let record=null,busy=false,polling=false,timer,verified=null,finished=false,pollDeadline=Date.now()+900000;
 try{record=JSON.parse(localStorage.getItem(STORE)||'null');if(!record?.id||!record?.secret||Date.now()-record.created>86400000)record=null;}catch{}
 function remember(){localStorage.setItem(STORE,JSON.stringify(record));}
 function forget(){localStorage.removeItem(STORE);record=null;clearTimeout(timer);}
 function open(){if(!inline&&!root.open)root.showModal();}
 function frame(content){
  root.innerHTML=(inline?'':'<button class="du-close" type="button" aria-label="Fermer le déblocage">✕</button>')+'<span class="du-kicker">DÉBLOCAGE ADMINISTRATEUR</span>'+content+'<p id="du-error" class="du-error" role="alert"></p>';
  $('.du-close')?.addEventListener('click',()=>root.close());
 }
 function fail(error){if($('#du-error'))$('#du-error').textContent=error.message||'Vérifie ta connexion puis réessaie.';}
 async function api(action,extra={},token){
  const response=await fetch(BASE+'/functions/v1/clair-device-unlock',{method:'POST',headers:{apikey:KEY,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({action,id:record.id,secret:record.secret,...extra}),cache:'no-store',signal:AbortSignal.timeout(20000)});
  let result;try{result=await response.json();}catch{throw Error('Le serveur ne répond pas. Réessaie.');}
  if(!response.ok)throw Error(result.error||'Déblocage indisponible.');return result;
 }
 function deviceLabel(){
  const ua=navigator.userAgent,device=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Ordinateur Windows':/Macintosh/.test(ua)?'Mac':'Cet appareil';
  const browser=/Edg/.test(ua)?'Edge':/Chrome|CriOS/.test(ua)?'Chrome':/Firefox|FxiOS/.test(ua)?'Firefox':/Safari/.test(ua)?'Safari':'Navigateur';
  return device+' · '+browser;
 }
 function entry(){
  clearTimeout(timer);verified=null;finished=false;
  frame('<h2>Retrouver ton compte.</h2><p>Envoie une demande depuis cet appareil. Après l’autorisation de l’administrateur, tu choisiras ici ton nouveau mot de passe, sans e-mail ni code.</p><form id="du-request"><label for="du-email">Adresse de ton compte Clair</label><input id="du-email" type="email" autocomplete="email" maxlength="254" required><button type="submit">Demander le déblocage</button></form><p class="du-note">Tes dépenses et ton historique seront conservés. L’administrateur doit vérifier que la demande vient de toi.</p>');
  const current=document.querySelector('#account-form input[name="email"]');if(current)$('#du-email').value=current.value;
  $('#du-request').onsubmit=async event=>{
   event.preventDefault();if(busy)return;busy=true;event.submitter.disabled=true;
   try{
    const email=$('#du-email').value.trim().toLowerCase();
    record={id:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),email,created:Date.now()};
    // Persist before transmission so a slow response or reload cannot orphan this device's request.
    remember();await api('request',{email,device:deviceLabel()});waiting();pollDeadline=Date.now()+900000;poll();
   }catch(error){fail(error);}finally{busy=false;if($('#du-request button'))$('#du-request button').disabled=false;}
  };
 }
 function waiting(){
  frame('<h2>En attente de l’administrateur.</h2><p>Ta demande concerne <strong>'+esc(record.email)+'</strong>.</p><p id="du-wait-status" role="status">Garde cette page ouverte ou reviens sur Clair avec ce même appareil. Le nouveau mot de passe te sera demandé dès que l’administrateur aura autorisé le déblocage.</p><button type="button" id="du-check">Vérifier maintenant</button><button type="button" id="du-new" class="du-secondary">Faire une nouvelle demande</button>');
  $('#du-check').onclick=()=>{pollDeadline=Date.now()+900000;poll();};
  $('#du-new').onclick=()=>{forget();entry();};
 }
 async function passwordStep(){
  const result=await client.auth.getUser();if(result.error||!result.data?.user?.id||!result.data.user.email_confirmed_at)throw Error('La vérification a expiré. Reprends la demande.');
  verified=result.data.user.id;clearTimeout(timer);record.phase='password';remember();open();
  frame('<h2>L’administrateur a débloqué ton application.</h2><p>Choisis ton nouveau mot de passe pour <strong>'+esc(result.data.user.email)+'</strong>. Tu gardes le même compte et le même historique.</p><form id="du-password"><label for="du-new-password">Nouveau mot de passe</label><input id="du-new-password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><label for="du-confirm-password">Confirmer le mot de passe</label><input id="du-confirm-password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required><button type="submit">Enregistrer et ouvrir Clair</button></form><p class="du-note">12 caractères minimum. Tu peux utiliser une phrase.</p>');
  $('#du-password').onsubmit=async event=>{
   event.preventDefault();if(busy||finished)return;busy=true;event.submitter.disabled=true;$('#du-error').textContent='';
   const password=$('#du-new-password').value;
   try{
    if(password!==$('#du-confirm-password').value)throw Error('Les deux mots de passe sont différents.');
    const identity=await client.auth.getUser();if(identity.error||identity.data.user?.id!==verified)throw Error('La vérification a expiré. Rouvre Clair.');
    const result=await client.auth.updateUser({password});if(result.error)throw Error('Le nouveau mot de passe n’a pas pu être enregistré. Réessaie.');
    finished=true;$('#du-new-password').value='';$('#du-confirm-password').value='';
    const session=await client.auth.getSession();
    try{await api('complete',{},session.data?.session?.access_token);}catch{}
    forget();
    // Sign in to Clair's ordinary session; the budget loader continues to use the same user ID.
    const main=supabase.createClient(BASE,KEY,{auth:{storageKey:'clair-account-session-v1',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
    const signed=await main.auth.signInWithPassword({email:identity.data.user.email,password});
    try{await client.auth.signOut({scope:'local'});}catch{}sessionStorage.removeItem(AUTH);
    frame('<h2>Ton nouveau mot de passe est enregistré.</h2><p>Ton compte et ton historique sont conservés.</p><a class="du-button" href="./">Ouvrir Clair</a>');
    if(!signed.error){if(inline)location.assign('./');else location.reload();}
   }catch(error){fail(error);}finally{busy=false;if($('#du-password button'))$('#du-password button').disabled=false;}
  };
 }
 async function poll(){
  clearTimeout(timer);if(polling||!record||verified||finished)return;polling=true;
  try{
   const result=await api('poll');
   if(result.state==='ready'){
    const check=await client.auth.verifyOtp({token_hash:result.token_hash,type:'recovery'});
    if(check.error)throw Error('Le déblocage n’a pas pu être vérifié. Réessaie dans un instant.');
    await passwordStep();return;
   }
   if(result.state==='expired'){forget();entry();throw Error('Cette demande a expiré. Envoie une nouvelle demande depuis cet appareil.');}
   if($('#du-wait-status'))$('#du-wait-status').textContent='L’autorisation n’est pas encore disponible. Cette page se met à jour automatiquement.';
  }catch(error){fail(error);}
  finally{polling=false;if(record&&!verified&&!finished&&Date.now()<pollDeadline)timer=setTimeout(()=>{if(document.visibilityState==='visible')poll();else timer=setTimeout(poll,15000);},5000);}
 }
 function ensureEntry(){
  const form=document.querySelector('#account-form,#account-forgot-form'),card=form?.closest('.account-card');
  if(card&&!document.querySelector('#du-open')){
   const button=Object.assign(document.createElement('button'),{id:'du-open',type:'button',className:'button',textContent:'Demander un déblocage administrateur'});
   button.addEventListener('click',()=>{if(record){waiting();poll();}else entry();open();});form.after(button);
  }
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href="help.html"]');if(!link||inline)return;event.preventDefault();if(record){waiting();poll();}else entry();open();
 });
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&record&&!verified)poll();});
 new MutationObserver(ensureEntry).observe(document.body,{childList:true,subtree:true});ensureEntry();
 (async()=>{
  if(record){
   const session=await client.auth.getSession();
   if(record.phase==='password'&&session.data?.session){try{await passwordStep();return;}catch{}}
   waiting();open();poll();
  }else if(inline)entry();
 })().catch(fail);
})();
