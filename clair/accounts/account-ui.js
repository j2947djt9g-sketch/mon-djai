  /* ---------- Compte et synchronisation ---------- */
  window.CLAIR_ACCOUNT_CONFIG=location.protocol==='file:'?null:(window.CLAIR_ACCOUNT_CONFIG===undefined?{"url":"https://hkssnbvktfscizojhftl.supabase.co","key":"sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8"}:window.CLAIR_ACCOUNT_CONFIG);
  const recoveryParams=new URLSearchParams((location.hash||'').slice(1));
  const recoveryQuery=new URLSearchParams(location.search||'');
  const recoveryError=recoveryParams.get('error_code')||recoveryQuery.get('error_code')||recoveryParams.get('error')||recoveryQuery.get('error');
  let accountMode='login',accountBusy=false,accountRecovery=recoveryParams.get('type')==='recovery',accountStarted=false;
  let accountResetStep=accountRecovery?'checking':recoveryError?'expired':null;
  let accountResetEmail='',accountRecoveryUserId=null,accountDeferredSetup=false;
  let accountSignupResult=null,accountChangeUserId=null,accountChangeNonceRequired=false,accountChangeResendUntil=0;
  const cloud=new window.ClairCloud(window.CLAIR_ACCOUNT_CONFIG,{
    normalize: value=>E.normalize(value),
    status:()=>{
      if(accountResetStep){
        if(cloud.ready&&cloud.status!=='loading'&&
          (accountResetStep==='checking'||(accountResetStep==='password'&&cloud.user?.id!==accountRecoveryUserId)))
          accountResetStep=cloud.user?.id===accountRecoveryUserId&&accountRecoveryUserId?'password':'expired';
        const editing=(accountResetStep==='email'&&$('#account-forgot-form'))||
          (accountResetStep==='password'&&$('#account-password-form'));
        if(!editing)render();
        return;
      }
      if(!cloud.user||!cloud.ready||cloud.status==='loading'||$('#account-form')||$('#account-loading'))render();
      else renderAccountStatus();
    },
    recovery:user=>{accountRecovery=true;accountRecoveryUserId=user?.id||null;accountResetStep='password';close();},
    opened:()=>{if(!accountResetStep){catchUp();queuePushSync();}},
    enter:(user,record)=>{
      close();wizard=null;undo=null;recovery=null;page='home';
      KEY=cloud.key(user.id);BACKUP=KEY+'-backup';REMINDED=KEY+'-reminded';PUSH_KEY=KEY+'-push';
      data=record?record.payload:E.empty();snapshot=localStorage.getItem(KEY);loadError=null;rawRecovery='';
    },
    leave:()=>{close();wizard=null;undo=null;data=E.empty();snapshot=null;page='home';loadError=null;rawRecovery='';},
    badCache:(error,raw)=>{loadError=error.message;rawRecovery=raw||'';render();},
    apply:(next,raw)=>{
      const changed=JSON.stringify(next)!==JSON.stringify(data);
      if(changed){close();wizard=null;undo=null;}
      data=next;snapshot=raw;loadError=null;if(accountResetStep)return;render();catchUp();
      if(changed&&data.initialized)notify('Budget actualisé depuis ton compte.');
    },
    empty:()=>{
      if(accountResetStep){accountDeferredSetup=true;return;}
      const legacy=legacyBudget();
      if(legacy?.initialized)dialog('Retrouver ton budget actuel',`<p>Ce navigateur contient déjà ${legacy.transactions.length} opérations. Tu peux les transférer vers ton compte.</p><p class="help">Le compte connecté : ${esc(cloud.user.email)}.</p><div class="actions"><button class="button primary" data-action="account-import">Transférer mon budget</button><button class="button" data-action="account-start-empty">Commencer un nouveau budget</button></div>`,'account-import');
      else if(!data.initialized)beginSetup();
    }
  });
  function legacyBudget(){
    try{const owner=localStorage.getItem('clair-local-owner-v1');if(owner&&owner!==cloud.user?.id)return null;const raw=localStorage.getItem(LOCAL_KEY)||localStorage.getItem(OLD_KEY);return raw?E.normalize(JSON.parse(raw)):null;}catch{return null;}
  }
  function storedData(raw){const value=JSON.parse(raw);return E.normalize(value);}
  function saveData(value){return cloud.enabled&&cloud.user?cloud.pack(value):JSON.stringify(value);}
  function afterLocalSave(){if(cloud.enabled&&cloud.user)cloud.saved(snapshot);}

  // Presentation only: forms and authentication state remain managed by Clair.
  function accountLayout(markup){
    const guide=markup.match(/<div class="mascot-guide">[\s\S]*?<\/div>/)?.[0]||
      mascot(0,accountResetStep?'Retrouvons ton espace, simplement.':'Ton budget, à portée de main.');
    const content=markup.replace(/<div class="brand-mark" aria-hidden="true">[\s\S]*?<\/svg><\/div>/,'')
      .replace(/<div class="mascot-guide">[\s\S]*?<\/div>/,'');
    return '<div class="account-layout"><aside class="account-scene" aria-label="Clair sur tes appareils">'+
      '<div class="account-device-badge"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></svg></span>Téléphone et ordinateur</div>'+
      '<div class="account-mascot-stage">'+guide+'</div>'+
      '<p class="account-scene-caption">Un compte.<br><strong>Ton budget te suit.</strong></p></aside>'+
      '<div class="account-form-pane"><p class="eyebrow">Espace personnel</p>'+content+
      '<p class="account-form-signature">Ton budget, l’esprit tranquille.</p></div></div>'+
      '<p class="account-screen-credit">Développé par El-Hadj</p>';
  }
  function accountGate(){
    if(!cloud.ready||cloud.status==='loading')return '<section class="card" id="account-loading"><h1>Ouverture de ton compte…</h1><p class="help">Ta copie locale est conservée.</p></section>';
    const signup=accountMode==='signup';
    if(signup&&accountSignupResult)return `<section class="card account-card"><div class="brand-mark" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><defs><linearGradient id="brand-auth-1-violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b4dff"/><stop offset="1" stop-color="#6528d7"/></linearGradient><linearGradient id="brand-auth-1-fold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6f0ff"/><stop offset="1" stop-color="#d7c3ff"/></linearGradient><linearGradient id="brand-auth-1-edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e9ddff"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#brand-auth-1-violet)"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c-7 4-11 11-11 19v32c0 8 4 15 11 19l32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0l-98-58c-19-11-29-29-29-51v-83c0-22 10-40 29-51Z" fill="#fff"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c17-33 24-98 57-132Z" fill="url(#brand-auth-1-fold)"/><path d="m227 299 32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0-22-17-21-77-22-118Z" fill="url(#brand-auth-1-edge)"/></svg></div>${mascot(1,'Retrouvons ton espace.')}<h1>${accountSignupResult==='exists'?'Tu as déjà un compte.':'Vérifie tes e-mails.'}</h1><p class="muted">${accountSignupResult==='exists'?'Cette adresse e-mail est déjà associée à un compte. Connecte-toi ou récupère ton mot de passe.':'Si cette adresse peut créer un compte, tu recevras un e-mail pour le confirmer. Si tu as déjà un compte, connecte-toi ou récupère ton mot de passe.'}</p><p class="recovery-email">${esc(accountResetEmail)}</p><p id="account-error" class="help negative" role="alert"></p><div class="recovery-actions"><button class="button primary" data-action="account-login">Me connecter</button><button class="button" data-action="account-forgot">Mot de passe oublié ?</button><button class="link" data-action="account-signup-edit">Corriger mon adresse</button></div></section>`;
    return `<section class="card account-card"><div class="brand-mark" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><defs><linearGradient id="brand-auth-2-violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b4dff"/><stop offset="1" stop-color="#6528d7"/></linearGradient><linearGradient id="brand-auth-2-fold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6f0ff"/><stop offset="1" stop-color="#d7c3ff"/></linearGradient><linearGradient id="brand-auth-2-edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e9ddff"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#brand-auth-2-violet)"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c-7 4-11 11-11 19v32c0 8 4 15 11 19l32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0l-98-58c-19-11-29-29-29-51v-83c0-22 10-40 29-51Z" fill="#fff"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c17-33 24-98 57-132Z" fill="url(#brand-auth-2-fold)"/><path d="m227 299 32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0-22-17-21-77-22-118Z" fill="url(#brand-auth-2-edge)"/></svg></div>${mascot(signup?1:0,signup?"Préparons ton espace, à ton rythme.":"Heureuse de te retrouver.")}<h1>${signup?"Créons ton espace.":"Ton budget, partout."}</h1><p class="muted">Le même compte sur ton téléphone et ton ordinateur.</p><form id="account-form" data-mode="${accountMode}">${signup?field('Ton prénom','displayName','','text','required maxlength="64" autocomplete="given-name"'):''}${field('Adresse e-mail','email',accountResetEmail,'email','required maxlength="254" autocomplete="username"')}${field('Mot de passe','password','','password',`required minlength="${signup?12:1}" maxlength="128" autocomplete="${signup?'new-password':'current-password'}"`)}<button class="link account-password-visibility" type="button" data-action="account-entry-toggle" aria-pressed="false">Afficher le mot de passe</button>${signup?'<p class="help">12 caractères minimum. Ton adresse e-mail devra être confirmée.</p>':''}<p id="account-error" class="help negative" role="alert"></p><button class="button primary" type="submit">${signup?'Créer mon compte':'Me connecter'}</button></form><div class="actions"><button class="link" data-action="account-mode">${signup?'J’ai déjà un compte':'Créer un compte'}</button>${!signup?'<button class="link" data-action="account-forgot">Mot de passe oublié ?</button>':''}</div><p class="help">${esc(cloud.error||'Chaque compte possède son propre budget.')}</p></section>`;
  }
  function accountCard(){
    if(!cloud.enabled||!cloud.user)return '';
    return `<section class="card"><h2>Mon compte</h2><p>${esc(cloud.displayName||'Mon espace')}</p><p class="help">${esc(cloud.user.email)}</p><p class="help">${esc(accountStatus())}</p><div class="actions"><button class="button" data-action="account-change-password">Modifier mon mot de passe</button><button class="button" data-action="account-sync" ${cloud.busy?'disabled':''}>Synchroniser</button><button class="link" data-action="account-logout">Me déconnecter</button></div><details class="settings-more"><summary>Ancien budget sur cet appareil</summary><p class="help">Le transfert demande confirmation et conserve une copie de secours.</p><button class="button" data-action="account-import">Transférer mon ancien budget</button></details></section>`;
  }
  function changePasswordDialog(){
    if(!cloud.user||!cloud.ready){notify('Connecte-toi à ton compte pour modifier ton mot de passe.');return;}
    accountChangeUserId=cloud.user.id;accountChangeNonceRequired=false;accountChangeResendUntil=0;
    dialog('Modifier mon mot de passe',`<p class="help">Pour ton compte ${esc(cloud.user.email)}.</p><form id="account-change-password-form">${field('Mot de passe actuel','currentPassword','','password','required maxlength="128" autocomplete="current-password"')}${field('Nouveau mot de passe','password','','password','required minlength="12" maxlength="128" autocomplete="new-password" aria-describedby="account-change-help"')}${field('Confirmer le nouveau mot de passe','passwordConfirm','','password','required minlength="12" maxlength="128" autocomplete="new-password"')}<button type="button" class="link password-toggle" data-action="account-change-toggle" aria-pressed="false">Afficher les mots de passe</button><p class="help" id="account-change-help">12 caractères minimum. Tu peux utiliser une phrase.</p><div id="account-change-verification" hidden><p class="help" id="account-change-code-help" role="status">Saisis le code de vérification reçu par e-mail.</p>${field('Code de vérification','nonce','','tel','autocomplete="one-time-code" inputmode="numeric" maxlength="16" aria-describedby="account-change-code-help"')}<button type="button" class="link" data-action="account-change-resend">Renvoyer le code</button></div>${formActions('Enregistrer mon mot de passe')}</form>`,'account-change-password');
  }
  function passwordChangeActive(){return modal?.kind==='account-change-password'&&accountChangeUserId===cloud.user?.id&&$('#dialog').open;}
  async function sendPasswordVerification(){
    if(!passwordChangeActive())return;
    if(accountChangeResendUntil>Date.now())throw Error('Attends une minute avant de renvoyer le code.');
    const {error}=await cloud.client.auth.reauthenticate();
    if(!passwordChangeActive())return;
    if(error){
      if(error.status===429){accountChangeResendUntil=Date.now()+60000;throw Error('Trop de demandes. Attends un moment avant de réessayer.');}
      throw Error('Le code n’a pas pu être envoyé. Vérifie ta connexion, puis réessaie.');
    }
    accountChangeResendUntil=Date.now()+60000;
    $('#account-change-code-help').textContent='Un code de vérification a été envoyé par e-mail. Saisis-le pour enregistrer ton mot de passe.';
    $('#account-change-password-form input[name="nonce"]')?.focus();
  }
  async function changePassword(form,f,password){
    if(!passwordChangeActive())throw Error('Rouvre « Modifier mon mot de passe » depuis ton compte.');
    const currentPassword=String(f.get('currentPassword')||''),confirmation=String(f.get('passwordConfirm')||''),nonce=String(f.get('nonce')||'').trim();
    if(!currentPassword)throw Error('Indique ton mot de passe actuel.');
    if(password.length<12||password.length>128)throw Error('Utilise entre 12 et 128 caractères pour le nouveau mot de passe.');
    if(password!==confirmation)throw Error('Les deux nouveaux mots de passe ne correspondent pas.');
    if(password===currentPassword)throw Error('Choisis un mot de passe différent du précédent.');
    if(navigator.onLine===false)throw Error('Vérifie ta connexion Internet, puis réessaie.');
    if(accountChangeNonceRequired&&!nonce)throw Error('Saisis le code de vérification reçu par e-mail.');
    // Verify through a separate transient session: the project's current-password
    // requirement may be disabled. Never replace or persist the budget session.
    const verifier=supabase.createClient(window.CLAIR_ACCOUNT_CONFIG.url,window.CLAIR_ACCOUNT_CONFIG.key,{auth:{storageKey:'clair-password-check-'+crypto.randomUUID(),persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    let temporarySession=false;
    try{
      const checked=await verifier.auth.signInWithPassword({email:cloud.user.email,password:currentPassword});
      temporarySession=Boolean(checked.data?.session);
      if(checked.error){
        if(checked.error.code==='invalid_credentials')throw Error('Le mot de passe actuel est incorrect.');
        if(checked.error.status===429)throw Error('Trop de tentatives. Attends un moment avant de réessayer.');
        throw Error('Le mot de passe actuel n’a pas pu être vérifié. Vérifie ta connexion, puis réessaie.');
      }
      if(checked.data?.user?.id!==accountChangeUserId)throw Error('La vérification du compte n’a pas abouti. Rouvre les réglages.');
    }finally{if(temporarySession)try{await verifier.auth.signOut({scope:'local'});}catch{}}
    if(!passwordChangeActive())return;
    // The vendored SDK forwards attributes unchanged: Auth expects current_password.
    const {error}=await cloud.client.auth.updateUser({password,current_password:currentPassword,...(accountChangeNonceRequired?{nonce}:{})});
    if(!passwordChangeActive())return;
    if(error){
      if(error.code==='reauthentication_needed'){
        accountChangeNonceRequired=true;$('#account-change-verification').hidden=false;
        $('#account-change-password-form input[name="nonce"]').required=true;
        await sendPasswordVerification();return;
      }
      if(error.code==='reauthentication_not_valid')throw Error('Ce code est incorrect ou expiré. Vérifie-le ou demande un nouveau code.');
      if(['invalid_credentials','current_password_mismatch'].includes(error.code))throw Error('Le mot de passe actuel est incorrect.');
      if(error.code==='current_password_required')throw Error('Indique ton mot de passe actuel, puis réessaie.');
      if(error.code==='same_password')throw Error('Choisis un mot de passe différent du précédent.');
      if(error.code==='weak_password')throw Error('Ce mot de passe est trop facile à deviner. Choisis une phrase plus longue.');
      if(['session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','user_not_found'].includes(error.code))throw Error('Ta session a expiré. Reconnecte-toi, puis réessaie.');
      if(error.status===429)throw Error('Trop de demandes. Attends un moment avant de réessayer.');
      throw Error('Le mot de passe n’a pas pu être enregistré. Vérifie ta connexion, puis réessaie.');
    }
    form.reset();accountChangeUserId=null;
    dialog('Mot de passe modifié','<p role="status">Ton nouveau mot de passe est enregistré.</p><button class="button primary" data-action="close">Revenir à mes réglages</button>','account-change-done');
  }
  function accountStatus(){return {loading:'Connexion…','signed-out':'Connexion requise',synced:'Synchronisé',pending:'À synchroniser',offline:'Hors ligne · enregistré ici',error:'Synchronisation à reprendre',conflict:'Deux copies à départager'}[cloud.status]||'Sur cet appareil';}
  function renderAccountStatus(){
    if(!cloud.enabled)return;
    const target=$('#sync-alert');
    if(!cloud.user){target.innerHTML='';return;}
    $('#status-label').textContent=accountStatus();
    target.innerHTML=cloud.conflict?'<div class="notice"><p>Deux appareils ont modifié ton budget. Les deux copies sont conservées.</p><button class="button" data-action="account-conflict">Choisir une copie</button></div>':cloud.error?`<div class="notice">${esc(cloud.error)} <button class="link" data-action="account-sync">Réessayer</button></div>`:'';
  }
  function recoveryView(){
    let body='';
    const error='<p id="account-error" class="help negative" role="alert"></p>';
    const back='<button class="link" data-action="account-reset-back">Retour à la connexion</button>';
    if(accountResetStep==='checking'||(accountResetStep==='password'&&(!cloud.ready||!cloud.user))){
      body='<h1>Vérification du lien…</h1><p class="muted" role="status">Un instant, nous ouvrons la récupération de ton compte.</p>';
    }else if(accountResetStep==='email'){
      body='<h1>Retrouver mon compte</h1><p class="muted">Reçois un lien pour choisir un nouveau mot de passe.</p>'+
        '<form id="account-forgot-form">'+field('Adresse e-mail','email',accountResetEmail,'email','required maxlength="254" autocomplete="email" autocapitalize="none" spellcheck="false"')+error+
        '<button class="button primary" id="account-reset-send" type="submit" '+(accountBusy?'disabled':'')+'>'+(accountBusy?'Envoi en cours…':'Envoyer le lien')+'</button></form>'+back;
    }else if(accountResetStep==='sent'){
      body='<h1>Vérifie tes e-mails</h1><p class="muted">Si un compte utilise cette adresse, tu recevras un lien pour changer ton mot de passe.</p>'+
        '<p class="recovery-email">'+esc(accountResetEmail)+'</p><p class="help">Ouvre le lien reçu : tu pourras saisir directement ton nouveau mot de passe. Pense à vérifier les indésirables.</p>'+error+
        '<div class="recovery-actions"><button class="button primary" id="account-reset-resend" data-action="account-reset-resend" '+(accountBusy?'disabled':'')+'>'+(accountBusy?'Envoi en cours…':'Renvoyer le lien')+'</button>'+
        '<button class="link" data-action="account-reset-edit">Corriger mon adresse</button>'+back+'</div>';
    }else if(accountResetStep==='password'){
      body='<h1>Nouveau mot de passe</h1><p class="muted">Choisis le mot de passe de ton compte Clair.</p>'+
        '<form id="account-password-form"><label class="field"><span>Nouveau mot de passe</span><input id="account-new-password" name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password" aria-describedby="account-password-help"></label>'+
        '<button type="button" class="link password-toggle" data-action="account-password-toggle" aria-controls="account-new-password" aria-pressed="false">Afficher le mot de passe</button>'+
        '<p class="help" id="account-password-help">12 caractères minimum. Tu peux utiliser une phrase.</p>'+error+
        '<button class="button primary" type="submit">Enregistrer mon mot de passe</button></form>';
    }else if(accountResetStep==='done'){
      body='<h1>Mot de passe modifié</h1><p class="muted" role="status">Ton nouveau mot de passe est enregistré.</p>'+
        '<button class="button primary" data-action="account-reset-finish">Accéder à mon budget</button>';
    }else{
      body='<h1>Ce lien ne fonctionne plus</h1><p class="muted">Il a expiré, a déjà été utilisé ou est incomplet. Demande un nouveau lien pour récupérer ton compte.</p>'+
        '<button class="button primary" data-action="account-reset-edit">Demander un nouveau lien</button>'+back;
    }
    return '<section class="card account-card account-recovery" aria-labelledby="recovery-title"><div class="brand-mark" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><defs><linearGradient id="brand-auth-3-violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8b4dff"/><stop offset="1" stop-color="#6528d7"/></linearGradient><linearGradient id="brand-auth-3-fold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6f0ff"/><stop offset="1" stop-color="#d7c3ff"/></linearGradient><linearGradient id="brand-auth-3-edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e9ddff"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#brand-auth-3-violet)"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c-7 4-11 11-11 19v32c0 8 4 15 11 19l32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0l-98-58c-19-11-29-29-29-51v-83c0-22 10-40 29-51Z" fill="#fff"/><path d="M284 97c14-8 29-7 44 2l64 40c12 7 15 20 8 31l-33 49c-7 11-19 14-30 7l-39-23c-9-5-18-5-27 0l-44 26c17-33 24-98 57-132Z" fill="url(#brand-auth-3-fold)"/><path d="m227 299 32 19c7 4 15 4 22 0l58-34c10-6 22-3 28 7l30 46c7 11 4 24-8 31l-84 49c-18 11-38 11-56 0-22-17-21-77-22-118Z" fill="url(#brand-auth-3-edge)"/></svg></div>'+
      body.replace('<h1>','<h1 id="recovery-title" tabindex="-1">')+'</section>';
  }
  function focusRecovery(){setTimeout(()=>$('#recovery-title')?.focus({preventScroll:true}),0);}
  function updateRecoveryButtons(){
    const button=$('#account-reset-resend')||$('#account-reset-send');
    if(button){button.disabled=accountBusy;button.textContent=accountBusy?'Envoi en cours…':accountResetStep==='sent'?'Renvoyer le lien':'Envoyer le lien';}
  }
  function clearRecoveryAddress(){
    if(!accountRecovery&&!recoveryError)return;
    // The SDK has already consumed the return from Auth. Never store its URL tokens.
    try{const search=new URLSearchParams(location.search||'');for(const key of ['error','error_code','error_description'])search.delete(key);history.replaceState(null,'',location.pathname+(search.size?'?'+search.toString():''));}catch{}
  }
  function finishRecovery(){
    if(accountBusy)return;
    clearRecoveryAddress();accountResetStep=null;accountRecovery=false;accountRecoveryUserId=null;
    close();render();
    if(cloud.user){catchUp();if(accountDeferredSetup){accountDeferredSetup=false;cloud.hooks.empty();}}
  }
  function accountMessage(message){
    const target=($('#dialog').open?$('#form-error'):null)||$('#account-error');
    if(target){target.textContent=message;if(message)target.scrollIntoView({block:'nearest'});}else notify(message);
  }
  async function sendRecovery(email){
    email=String(email||'').trim().toLowerCase();
    if(!email)throw Error('Indique l’adresse e-mail de ton compte.');
    if(navigator.onLine===false)throw Error('Vérifie ta connexion Internet, puis réessaie.');
    accountResetEmail=email;
    const {error}=await cloud.client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error){
      if(error.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(error.code)){
        throw Error('L’envoi est temporairement limité. Réessaie plus tard.');
      }
      if(navigator.onLine===false||error.name==='AuthRetryableFetchError')
        throw Error('Vérifie ta connexion Internet, puis réessaie.');
      throw Error('Le lien ne peut pas être envoyé pour le moment. Réessaie plus tard.');
    }
    accountResetStep='sent';render();focusRecovery();
  }
  async function accountSubmit(form){
    if(accountBusy)return;accountBusy=true;const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
    accountMessage('');if(form.id==='account-forgot-form')updateRecoveryButtons();
    try{
      const f=new FormData(form),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||'');
      if(form.id==='account-form'){
        const signup=form.dataset.mode==='signup';let response;
        if(signup){
          const name=String(f.get('displayName')||'').trim();if(!name||name.length>64||password.length<12)throw Error('Indique ton prénom et un mot de passe d’au moins 12 caractères.');
          accountResetEmail=email;
          response=await cloud.client.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:location.origin+location.pathname}});
        }else response=await cloud.client.auth.signInWithPassword({email,password});
        if(response.error){
          if(signup&&['user_already_exists','email_exists'].includes(response.error.code)){accountSignupResult='exists';render();return;}
          if(response.error.code==='invalid_credentials')throw Error('Adresse e-mail ou mot de passe incorrect.');
          if(response.error.status===429)throw Error('Trop de tentatives. Attends un moment avant de réessayer.');
          if(response.error.code==='email_not_confirmed')throw Error('Confirme ton adresse e-mail avant de te connecter.');
          throw Error('Connexion indisponible. Vérifie ta connexion Internet et réessaie.');
        }
        try{localStorage.removeItem('clair-auth-attempts-v1');}catch{}
        if(signup&&!response.data.session){accountSignupResult='confirmation';render();return;}
        await cloud.attach(response.data.user||response.data.session?.user);
      }
      if(form.id==='account-forgot-form')await sendRecovery(email);
      if(form.id==='account-change-password-form')await changePassword(form,f,password);
      if(form.id==='account-password-form'){
        if(!accountRecoveryUserId||cloud.user?.id!==accountRecoveryUserId){accountResetStep='expired';render();focusRecovery();return;}
        const recoveryUserId=accountRecoveryUserId;
        if(password.length<12||password.length>128)throw Error('Utilise entre 12 et 128 caractères.');
        const {error}=await cloud.client.auth.updateUser({password});
        if(accountRecoveryUserId!==recoveryUserId||cloud.user?.id!==recoveryUserId)return;
        if(error){
          if(error.status===401||['session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','user_not_found'].includes(error.code)){
            accountResetStep='expired';render();focusRecovery();return;
          }
          if(error.code==='same_password')throw Error('Choisis un mot de passe différent du précédent.');
          if(error.code==='weak_password')throw Error('Ce mot de passe est trop facile à deviner. Choisis une phrase plus longue.');
          if(error.status===429)throw Error('Trop de demandes. Attends un moment avant de réessayer.');
          throw Error(navigator.onLine===false?'Vérifie ta connexion Internet, puis réessaie.':'Le mot de passe n’a pas pu être enregistré. Réessaie.');
        }
        try{localStorage.removeItem('clair-auth-attempts-v1');}catch{}
        accountResetStep='done';accountRecovery=false;accountRecoveryUserId=null;render();focusRecovery();
      }
    }catch(error){accountMessage(error.message||'La connexion n’a pas abouti.');}
    finally{accountBusy=false;if(button)button.disabled=false;updateRecoveryButtons();}
  }
  function transferLegacy(){
    const legacy=legacyBudget();if(!legacy){notify('Aucun ancien budget à transférer sur cet appareil.');return;}
    if(cloud.conflict){notify('Résous d’abord le conflit entre les appareils.');return;}
    confirm('Transférer ce budget vers ton compte ?',`${legacy.transactions.length} opérations et ${legacy.rules.length} habitudes remplaceront le budget de ${cloud.user.email}. Une copie de secours sera conservée.`,()=>{
      try{
        localStorage.setItem(BACKUP,JSON.stringify(data));
        const owner=localStorage.getItem('clair-local-owner-v1');
        if(owner&&owner!==cloud.user.id)throw Error('Cet ancien budget est déjà associé à un autre compte.');
        const success=commit(d=>{for(const key of Object.keys(d))delete d[key];Object.assign(d,legacy);},'Budget transféré. Synchronisation en cours.');
        if(success){localStorage.setItem('clair-local-owner-v1',cloud.user.id);close();}
      }catch(error){notify(error.message);}
    });
  }
  function conflictDialog(){
    if(!cloud.conflict)return;
    dialog('Deux copies de ton budget',`<p>Choisis celle à conserver pour tous tes appareils. Télécharge les deux copies avant de choisir si tu souhaites les comparer.</p><div class="actions"><button class="button" data-action="account-export-device">Sauvegarder cette copie</button>${cloud.conflict.remote?'<button class="button" data-action="account-export-online">Sauvegarder la copie en ligne</button>':''}</div><div class="actions"><button class="button primary" data-action="account-keep-device">Garder cet appareil</button>${cloud.conflict.remote?'<button class="button" data-action="account-keep-online">Garder la copie en ligne</button>':''}</div>`,'account-conflict');
  }
  async function accountAction(action){
    if(action==='account-entry-toggle'){
      const input=$('#account-form input[name="password"]'),button=$('[data-action="account-entry-toggle"]');
      if(input&&button){const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Masquer le mot de passe':'Afficher le mot de passe';button.setAttribute('aria-pressed',String(show));}
      return;
    }
    if(action==='account-mode'||action==='account-login'||action==='account-signup-edit'){
      if(accountBusy)return;
      accountResetEmail=$('#account-form input[name="email"]')?.value?.trim().toLowerCase()||accountResetEmail;
      accountMode=action==='account-login'?'login':action==='account-signup-edit'?'signup':accountMode==='login'?'signup':'login';
      accountSignupResult=null;render();
    }
    if(action==='account-change-password'){if(!accountBusy)changePasswordDialog();}
    if(action==='account-change-toggle'){
      const inputs=$('#account-change-password-form')?.querySelectorAll('input[name="currentPassword"],input[name="password"],input[name="passwordConfirm"]');
      if(inputs?.length){const show=inputs[0].type==='password';for(const input of inputs)input.type=show?'text':'password';const button=$('[data-action="account-change-toggle"]');button.textContent=show?'Masquer les mots de passe':'Afficher les mots de passe';button.setAttribute('aria-pressed',String(show));}
    }
    if(action==='account-change-resend'){
      if(accountBusy)return;accountBusy=true;accountMessage('');
      try{await sendPasswordVerification();}catch(error){accountMessage(error.message);}finally{accountBusy=false;}
    }
    if(action==='account-forgot'||action==='account-reset-edit'){
      if(accountBusy)return;
      if(action==='account-forgot')accountResetEmail=$('#account-form input[name="email"]')?.value?.trim()||accountResetEmail;
      accountResetStep='email';close();clearRecoveryAddress();render();updateRecoveryButtons();focusRecovery();
    }
    if(action==='account-reset-back'||action==='account-reset-finish'){
      if(action==='account-reset-back')accountMode='login';
      finishRecovery();
    }
    if(action==='account-reset-resend'){
      if(accountBusy)return;
      accountBusy=true;accountMessage('');updateRecoveryButtons();
      try{await sendRecovery(accountResetEmail);}catch(error){accountMessage(error.message);}
      finally{accountBusy=false;updateRecoveryButtons();}
    }
    if(action==='account-password-toggle'){
      const input=$('#account-new-password'),button=$('[data-action="account-password-toggle"]');
      if(input&&button){const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Masquer le mot de passe':'Afficher le mot de passe';button.setAttribute('aria-pressed',String(show));}
    }
    if(action==='account-import')transferLegacy();
    if(action==='account-start-empty'){close();beginSetup();}
    if(action==='account-sync')await cloud.sync();
    if(action==='account-logout')try{await disablePush(true);await cloud.logout();}catch(error){notify(error.message);}
    if(action==='account-conflict')conflictDialog();
    if(action==='account-export-device')download(JSON.stringify(data,null,2),'Clair-copie-appareil.json');
    if(action==='account-export-online'&&cloud.conflict?.remote)download(JSON.stringify(cloud.conflict.remote.payload,null,2),'Clair-copie-en-ligne.json');
    if(action==='account-keep-device'||action==='account-keep-online'){
      const useRemote=action==='account-keep-online';confirm('Conserver cette copie ?', 'L’autre copie sera téléchargée en sauvegarde avant le remplacement.',()=>{
        const other=useRemote?data:cloud.conflict?.remote?.payload;if(other)download(JSON.stringify(other,null,2),'Clair-avant-resolution.json');
        localStorage.setItem(BACKUP,JSON.stringify(other||data));cloud.resolve(useRemote);close();
      });
    }
  }
