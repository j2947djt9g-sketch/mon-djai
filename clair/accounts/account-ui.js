  /* ---------- Compte et synchronisation ---------- */
  window.CLAIR_ACCOUNT_CONFIG=location.protocol==='file:'?null:(window.CLAIR_ACCOUNT_CONFIG===undefined?{"url":"https://hkssnbvktfscizojhftl.supabase.co","key":"sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8"}:window.CLAIR_ACCOUNT_CONFIG);
  let accountMode='login',accountBusy=false,accountRecovery=/(?:^#|&)type=recovery(?:&|$)/.test(location.hash||''),accountStarted=false;
  const cloud=new window.ClairCloud(window.CLAIR_ACCOUNT_CONFIG,{
    normalize: value=>E.normalize(value),
    status:()=>{if(!cloud.user||!cloud.ready||cloud.status==='loading'||$('#account-form')||$('#account-loading'))render();else renderAccountStatus();if(accountRecovery&&cloud.ready&&cloud.user){accountRecovery=false;setTimeout(passwordDialog,0);}},
    recovery:()=>{accountRecovery=true;},
    opened:()=>{catchUp();},
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
      data=next;snapshot=raw;loadError=null;render();catchUp();
      if(changed&&data.initialized)notify('Budget actualisé depuis ton compte.');
    },
    empty:()=>{
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
  function accountGate(){
    if(!cloud.ready||cloud.status==='loading')return '<section class="card" id="account-loading"><h1>Ouverture de ton compte…</h1><p class="help">Ta copie locale est conservée.</p></section>';
    const signup=accountMode==='signup';
    return `<section class="card account-card"><div class="brand-mark" aria-hidden="true">c</div><h1>Ton budget, partout.</h1><p class="muted">Le même compte sur ton téléphone et ton ordinateur.</p><form id="account-form" data-mode="${accountMode}">${signup?field('Ton prénom','displayName','','text','required maxlength="64" autocomplete="given-name"'):''}${field('Adresse e-mail','email','','email','required maxlength="254" autocomplete="username"')}${field('Mot de passe','password','','password',`required minlength="${signup?12:1}" maxlength="128" autocomplete="${signup?'new-password':'current-password'}"`)}${signup?'<p class="help">12 caractères minimum. Ton adresse e-mail devra être confirmée.</p>':''}<p id="account-error" class="help negative" role="alert"></p><button class="button primary" type="submit">${signup?'Créer mon compte':'Me connecter'}</button></form><div class="actions"><button class="link" data-action="account-mode">${signup?'J’ai déjà un compte':'Créer un compte'}</button>${!signup?'<button class="link" data-action="account-forgot">Mot de passe oublié</button>':''}</div><p class="help">${esc(cloud.error||'Chaque compte possède son propre budget.')}</p></section>`;
  }
  function accountCard(){
    if(!cloud.enabled||!cloud.user)return '';
    return `<section class="card"><h2>Mon compte</h2><p>${esc(cloud.displayName||'Mon espace')}</p><p class="help">${esc(cloud.user.email)}</p><p class="help">${esc(accountStatus())}</p><div class="actions"><button class="button" data-action="account-sync" ${cloud.busy?'disabled':''}>Synchroniser</button><button class="link" data-action="account-logout">Me déconnecter</button></div><details class="settings-more"><summary>Ancien budget sur cet appareil</summary><p class="help">Le transfert demande confirmation et conserve une copie de secours.</p><button class="button" data-action="account-import">Transférer mon ancien budget</button></details></section>`;
  }
  function accountStatus(){return {loading:'Connexion…','signed-out':'Connexion requise',synced:'Synchronisé',pending:'À synchroniser',offline:'Hors ligne · enregistré ici',error:'Synchronisation à reprendre',conflict:'Deux copies à départager'}[cloud.status]||'Sur cet appareil';}
  function renderAccountStatus(){
    if(!cloud.enabled)return;
    const target=$('#sync-alert');
    if(!cloud.user){target.innerHTML='';return;}
    $('#status-label').textContent=accountStatus();
    target.innerHTML=cloud.conflict?'<div class="notice"><p>Deux appareils ont modifié ton budget. Les deux copies sont conservées.</p><button class="button" data-action="account-conflict">Choisir une copie</button></div>':cloud.error?`<div class="notice">${esc(cloud.error)} <button class="link" data-action="account-sync">Réessayer</button></div>`:'';
  }
  function passwordDialog(){dialog('Nouveau mot de passe',`<form id="account-password-form">${field('Mot de passe','password','','password','required minlength="12" maxlength="128" autocomplete="new-password"')}${formActions('Enregistrer')}</form>`,'account-password');}
  function accountMessage(message){const target=$('#account-error')||$('#form-error');if(target)target.textContent=message;else notify(message);}
  function attempts(){try{return JSON.parse(localStorage.getItem('clair-auth-attempts-v1')||'{"count":0,"until":0}');}catch{return {count:0,until:0};}}
  async function accountSubmit(form){
    if(accountBusy)return;accountBusy=true;const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
    try{
      const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
      if(form.id==='account-form'){
        const guard=attempts();if(guard.until>Date.now())throw Error('Attends une minute avant de réessayer.');
        const signup=form.dataset.mode==='signup';let response;
        if(signup){
          const name=String(f.get('displayName')||'').trim();if(!name||name.length>64||password.length<12)throw Error('Indique ton prénom et un mot de passe d’au moins 12 caractères.');
          response=await cloud.client.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:location.origin+location.pathname}});
        }else response=await cloud.client.auth.signInWithPassword({email,password});
        if(response.error){
          if(response.error.code==='invalid_credentials'){
            const count=(guard.until&&guard.until<=Date.now()?0:Number(guard.count)||0)+1;
            localStorage.setItem('clair-auth-attempts-v1',JSON.stringify({count,until:count>=3?Date.now()+60000:0}));
            throw Error(count>=3?'Trois essais incorrects. Réessaie dans une minute.':'Adresse e-mail ou mot de passe incorrect.');
          }
          if(response.error.status===429)throw Error('Trop de tentatives. Attends un moment avant de réessayer.');
          if(response.error.code==='email_not_confirmed')throw Error('Confirme ton adresse e-mail avant de te connecter.');
          throw Error('Connexion indisponible. Vérifie ta connexion Internet et réessaie.');
        }
        localStorage.removeItem('clair-auth-attempts-v1');
        if(signup&&!response.data.session){form.reset();accountMessage('Vérifie tes e-mails pour confirmer ton compte, puis connecte-toi ici.');return;}
        await cloud.attach(response.data.user||response.data.session?.user);
      }
      if(form.id==='account-forgot-form'){
        const {error}=await cloud.client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        if(error)throw Error('Envoi indisponible. Attends un moment et réessaie.');close();notify('Si ce compte existe, un lien de récupération a été envoyé.');
      }
      if(form.id==='account-password-form'){
        if(password.length<12)throw Error('Utilise au moins 12 caractères.');const {error}=await cloud.client.auth.updateUser({password});
        if(error)throw Error('Le mot de passe n’a pas pu être changé. Demande un nouveau lien.');close();notify('Mot de passe modifié.');
      }
    }catch(error){accountMessage(error.message||'La connexion n’a pas abouti.');}
    finally{accountBusy=false;if(button)button.disabled=false;}
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
    if(action==='account-mode'){accountMode=accountMode==='login'?'signup':'login';render();}
    if(action==='account-forgot')dialog('Retrouver mon compte',`<form id="account-forgot-form">${field('Adresse e-mail','email','','email','required maxlength="254" autocomplete="email"')}${formActions('Envoyer le lien')}</form>`,'account-forgot');
    if(action==='account-import')transferLegacy();
    if(action==='account-start-empty'){close();beginSetup();}
    if(action==='account-sync')await cloud.sync();
    if(action==='account-logout')try{await cloud.logout();}catch(error){notify(error.message);}
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
