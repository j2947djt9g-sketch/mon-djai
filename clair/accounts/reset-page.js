(function(){
 'use strict';
 const $=s=>document.querySelector(s);
 const hash=new URLSearchParams(location.hash.slice(1)),token=hash.get('token_hash');
 // Remove the credential before any verification call; never write it to storage or logs.
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 const KEY='clair-assisted-recovery-session-v1';
 const client=supabase.createClient('https://hkssnbvktfscizojhftl.supabase.co','sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8',{auth:{storageKey:KEY,storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 let busy=false,verifiedId=null,finished=false;
 const status=message=>$('#reset-status').textContent=message;
 const error=message=>$('#reset-error').textContent=message;
 async function showPassword(){
  const {data,error:failure}=await client.auth.getUser();
  if(failure||!data?.user?.id||!data.user.email_confirmed_at)throw Error('La vérification a expiré. Demande un nouveau lien ou un nouveau code.');
  verifiedId=data.user.id;$('#verified-email').textContent=data.user.email;$('#code-step').hidden=true;$('#password-step').hidden=false;status('Ton compte est vérifié. Choisis ton nouveau mot de passe.');$('#new-password').focus();
 }
 async function task(button,work){
  if(busy||finished)return;busy=true;button.disabled=true;error('');
  try{await work();}catch(e){error(e.message||'Une erreur est survenue. Réessaie.');}finally{busy=false;button.disabled=false;}
 }
 $('#code-form').onsubmit=e=>{e.preventDefault();task(e.submitter,async()=>{
  const {error:failure}=await client.auth.verifyOtp({email:$('#reset-email').value.trim().toLowerCase(),token:$('#reset-code').value.trim(),type:'recovery'});
  $('#reset-code').value='';
  if(failure)throw Error('Code incorrect, expiré ou déjà utilisé. Demande un nouveau code à l’administrateur.');
  await showPassword();
 });};
 $('#reset-resend').onclick=e=>task(e.currentTarget,async()=>{
  const input=$('#reset-email');if(!input.reportValidity())return;
  const {error:failure}=await client.auth.resetPasswordForEmail(input.value.trim().toLowerCase(),{redirectTo:'https://j2947djt9g-sketch.github.io/mon-djai/clair/'});
  if(failure)throw Error(failure.status===429?'L’envoi est temporairement limité. Réessaie plus tard.':'Le lien n’a pas pu être envoyé. Réessaie ou demande de l’aide.');
  status('Si un compte utilise cette adresse, un lien de récupération sera envoyé. Vérifie aussi les indésirables.');
 });
 $('#password-form').onsubmit=e=>{e.preventDefault();task(e.submitter,async()=>{
  const password=$('#new-password').value;
  if(password.length<12||password.length>128)throw Error('Utilise entre 12 et 128 caractères.');
  if(password!==$('#confirm-password').value)throw Error('Les deux mots de passe sont différents.');
  const {data,error:failure}=await client.auth.getUser();
  if(failure||!verifiedId||data.user?.id!==verifiedId)throw Error('Le compte a changé ou la vérification a expiré. Recommence avec ton lien.');
  const result=await client.auth.updateUser({password});
  if(result.error)throw Error('Le mot de passe n’a pas pu être enregistré. Réessaie.');
  finished=true;$('#new-password').value='';$('#confirm-password').value='';
  $('#password-step').hidden=true;$('#reset-success').hidden=false;status('Mot de passe enregistré.');
  try{await client.auth.signOut({scope:'global'});}catch{}finally{sessionStorage.removeItem(KEY);}
 });};
 (async()=>{
  if(token){
   busy=true;$('#code-step').hidden=true;status('Vérification du lien…');
   try{
    if(!/^[A-Za-z0-9_-]{32,128}$/.test(token))throw Error('Lien invalide.');
    const {error:failure}=await client.auth.verifyOtp({token_hash:token,type:'recovery'});
    if(failure)throw Error('Ce lien est expiré ou déjà utilisé. Demande un nouveau lien à l’administrateur.');
    await showPassword();
   }catch(e){$('#code-step').hidden=false;status('');error(e.message);}
   finally{busy=false;}
  }else{
   const {data}=await client.auth.getSession();
   if(data.session)try{await showPassword();}catch(e){error(e.message);}
  }
 })().catch(()=>{busy=false;$('#code-step').hidden=false;error('Connexion indisponible. Actualise la page.');});
})();