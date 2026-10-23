(function(){
  'use strict';
  const URL='https://hkssnbvktfscizojhftl.supabase.co',KEY='sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8';
  const client=supabase.createClient(URL,KEY,{auth:{storageKey:'clair-masterboard-session-v1',storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let snapshot=null,busy=false,toastTimer,loginEpoch=0;
  const day=v=>v?new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short',year:'numeric'}).format(new Date(v.length===10?v+'T12:00:00Z':v)):'—';
  const delta=until=>until?Math.round((Date.parse(until+'T12:00:00Z')-Date.parse(snapshot.today+'T12:00:00Z'))/86400000):null;
  const due=u=>u.test_until&&delta(u.test_until)<=2;
  const label=u=>!u.test_until?'Sans échéance de test':delta(u.test_until)<0?'Test expiré':delta(u.test_until)===0?'Test à échéance':delta(u.test_until)<=2?'Test à relancer':'Test actif';
  const states={prepared:'Brouillon préparé',opened:'Messagerie ouverte',confirmed_sent:'Envoi confirmé par toi'};
  const auditNames={test_month_added:'Un mois de test simulé',test_date_changed:'Échéance de test modifiée',test_settings_saved:'Coordonnées de test enregistrées',suspend_requested:'Suspension demandée',suspend_completed:'Compte suspendu',restore_requested:'Rétablissement demandé',restore_completed:'Compte rétabli',delete_requested:'Suppression demandée',delete_completed:'Compte supprimé'};
  function toast(text,error=false){clearTimeout(toastTimer);$('#global-status').textContent=text;$('#global-status').classList.toggle('error',error);toastTimer=setTimeout(()=>$('#global-status').textContent='',9000);}
  async function api(action,values={}){
    const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('Connecte-toi au masterboard.');
    const response=await fetch(URL+'/functions/v1/clair-masterboard',{method:'POST',headers:{'content-type':'application/json',apikey:KEY,authorization:'Bearer '+data.session.access_token},body:JSON.stringify({...values,action}),cache:'no-store',signal:AbortSignal.timeout(25000)});
    let result;try{result=await response.json();}catch{throw Error('Le serveur ne répond pas. Réessaie.');}
    if(!response.ok)throw Error(result.error||'Opération refusée.');return result;
  }
  async function refresh(){
    const epoch=loginEpoch;$('#refresh').disabled=true;
    try{const data=await api('snapshot');if(epoch!==loginEpoch)return;snapshot=data;$('#login').hidden=true;$('#board').hidden=false;$('#logout').hidden=false;$('#identity').textContent=data.actor.email;$('#phone').value=data.settings.payment_phone;render();}
    finally{$('#refresh').disabled=false;}
  }
  function render(){
    const s=snapshot;
    $('#stats').innerHTML=[['Comptes inscrits',s.users.length],['Adresses confirmées',s.users.filter(u=>u.confirmed).length],['Tests à relancer',s.users.filter(due).length],['Envois confirmés · 100 derniers',s.messages.filter(m=>m.state==='confirmed_sent').length]].map(([title,n],i)=>`<div class="stat"><strong class="${i===0?'accent':''}">${n}</strong><span>${title}</span></div>`).join('');
    renderUsers();
    $('#messages').innerHTML=s.messages.length?s.messages.map(m=>`<article class="mail-card"><div><span class="tag ${m.state==='confirmed_sent'?'':'neutral'}">${esc(states[m.state])}</span><h3>${esc(m.subject)}</h3><p>${esc(m.email)} · ${esc(day(m.created_at))}</p></div><button data-action="reopen" data-id="${esc(m.id)}">Reprendre le message ↗</button></article>`).join(''):'<p class="empty">Aucun message préparé. Choisis un compte puis « Préparer une relance ».</p>';
    $('#audit').innerHTML=s.audit.length?s.audit.map(a=>`<div class="audit-row"><span>${esc(auditNames[a.action]||a.action)}</span><time>${esc(day(a.created_at))}</time></div>`).join(''):'<p class="muted small">Les actions d’administration apparaîtront ici.</p>';
  }
  function renderUsers(){
    if(!snapshot)return;const search=$('#search').value.trim().toLowerCase(),filter=$('#filter').value;
    const users=snapshot.users.filter(u=>(u.name+' '+u.email).toLowerCase().includes(search)&&(filter==='all'||(filter==='due'&&due(u))||(filter==='banned'&&u.banned)));
    $('#users').innerHTML=users.length?users.map(u=>`<article class="user-card"><div class="user-top"><div class="user-id"><span class="avatar" aria-hidden="true">${esc((u.name||u.email).slice(0,1).toUpperCase())}</span><div><div class="user-name">${esc(u.name||'Compte Clair')}</div><div class="user-email">${esc(u.email)}</div></div></div>${u.is_admin?'<span class="tag">Admin</span>':''}</div><div class="user-tags"><span class="tag ${u.banned?'red':''}">${u.banned?'Suspendu':'Accès gratuit'}</span><span class="tag ${due(u)?'amber':'neutral'}">${esc(label(u))}</span><span class="tag neutral">${u.confirmed?'E-mail confirmé':'À confirmer'}</span></div><div class="user-meta"><div>Inscription<strong>${esc(day(u.created_at))}</strong></div><div>Échéance simulée<strong>${esc(day(u.test_until))}</strong></div></div><div class="user-actions"><button class="primary wide" data-action="reminder" data-user="${esc(u.id)}">Préparer une relance ↗</button><button data-action="renew" data-user="${esc(u.id)}">Simuler 1 mois payé</button><button data-action="date" data-user="${esc(u.id)}">Tester l’échéance</button><button data-action="recovery" data-user="${esc(u.id)}">Aider à récupérer</button>${!u.is_admin?`<button class="quiet" data-action="${u.banned?'restore':'suspend'}" data-user="${esc(u.id)}">${u.banned?'Rétablir':'Suspendre'}</button><button class="quiet danger" data-action="delete" data-user="${esc(u.id)}">Supprimer</button>`:''}</div></article>`).join(''):'<p class="empty">Aucun compte ne correspond à cette recherche.</p>';
  }
  function modal(html){$('#modal-content').innerHTML=html+'<p class="dialog-error" role="alert"></p>';if(!$('#modal').open)$('#modal').showModal();}
  const dialogError=e=>{$('.dialog-error').textContent=e.message||String(e);};
  function showMail(mail){
    const query=new URLSearchParams({authuser:snapshot.actor.email,view:'cm',fs:'1',to:mail.email,su:mail.subject,body:mail.body});
    const gmail='https://mail.google.com/mail/?'+query;
    const mailto='mailto:'+encodeURIComponent(mail.email)+'?'+new URLSearchParams({subject:mail.subject,body:mail.body}).toString().replace(/\+/g,'%20');
    modal(`<span class="eyebrow">${mail.kind==='reminder'?'RELANCE DE TEST':'RÉCUPÉRATION DE COMPTE'}</span><h2 id="modal-title">Ton message est prêt.</h2><p>À : ${esc(mail.email)}</p><p><strong>${esc(mail.subject)}</strong></p><pre class="mail-body">${esc(mail.body)}</pre><p>Ouvre ta messagerie, vérifie le destinataire puis appuie sur « Envoyer ». Reviens ici pour confirmer l’envoi.</p><div class="dialog-actions"><a class="button-link mail-open" href="${esc(gmail)}" target="_blank" rel="noopener noreferrer">Ouvrir Gmail et envoyer ↗</a><a class="button-link secondary mail-open" href="${esc(mailto)}">Autre messagerie</a><button id="copy-mail" class="quiet">Copier le texte</button></div><div class="dialog-actions"><button id="confirm-mail" class="secondary" ${mail.state==='prepared'||mail.state==='confirmed_sent'?'disabled':''}>${mail.state==='confirmed_sent'?'Envoi déjà confirmé':'J’ai envoyé le mail'}</button></div><p class="field-hint">${esc(states[mail.state])}. La réception n’est pas vérifiée automatiquement.</p>`);
    document.querySelectorAll('.mail-open').forEach(a=>a.addEventListener('click',async()=>{try{await api('mail-opened',{id:mail.id});if(mail.state!=='confirmed_sent'){$('#confirm-mail').disabled=false;$('.field-hint').textContent='Messagerie ouverte. Confirme uniquement après avoir envoyé le mail.';}}catch(e){dialogError(e);}}));
    $('#copy-mail').onclick=async()=>{try{await navigator.clipboard.writeText(mail.subject+'\n\n'+mail.body);toast('Texte copié.');}catch{toast('Sélectionne et copie le texte du message.',true);}};
    $('#confirm-mail').onclick=async()=>{const b=$('#confirm-mail');b.disabled=true;try{await api('mail-confirm',{id:mail.id});b.textContent='Envoi confirmé';toast('Envoi enregistré sur ta confirmation.');await refresh();}catch(e){b.disabled=false;dialogError(e);}};
  }
  function dateDialog(user){
    modal(`<span class="eyebrow">SIMULATION</span><h2 id="modal-title">Tester une échéance</h2><p>${esc(user.email)}. Cette date ne bloque pas l’accès à Clair.</p><div class="test-presets"><button data-offset="2">Relance J−2</button><button data-offset="0">Échéance aujourd’hui</button><button data-offset="-3">Retard de 3 jours</button></div><form id="date-form"><label for="test-date">Échéance simulée</label><input id="test-date" type="date" min="2000-01-01" max="2099-12-31" required value="${esc(user.test_until||snapshot.today)}"><div class="dialog-actions"><button type="submit" class="primary">Enregistrer l’échéance de test</button></div></form>`);
    document.querySelectorAll('[data-offset]').forEach(b=>b.onclick=()=>{const d=new Date(snapshot.today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Number(b.dataset.offset));$('#test-date').value=d.toISOString().slice(0,10);});
    $('#date-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api('set-test-date',{user_id:user.id,date:$('#test-date').value});$('#modal').close();await refresh();toast('Échéance de test enregistrée.');}catch(error){b.disabled=false;dialogError(error);}};
  }
  function renewDialog(user){
    modal(`<span class="eyebrow">PAIEMENT SIMULÉ</span><h2 id="modal-title">Ajouter un mois de test</h2><p>${esc(user.email)}</p><p>Simuler 1,99 € reçus et prolonger l’échéance d’un mois calendaire. Aucun argent n’est encaissé.</p><div class="dialog-actions"><button id="renew-confirm" class="primary">Confirmer le paiement simulé</button></div>`);
    $('#renew-confirm').onclick=async e=>{e.target.disabled=true;try{const r=await api('renew-test',{user_id:user.id});$('#modal').close();await refresh();toast('Simulation enregistrée jusqu’au '+day(r.test_until)+'.');}catch(error){e.target.disabled=false;dialogError(error);}};
  }
  function dangerDialog(user,action){
    const names={suspend:'Suspendre ce compte',restore:'Rétablir ce compte',delete:'Supprimer définitivement ce compte'};
    modal(`<h2 id="modal-title">${names[action]}</h2><p>${action==='delete'?'Le compte, son budget en ligne et ses appareils de notification seront supprimés. Il pourra ensuite se réinscrire avec cette adresse. Cette action est irréversible.':action==='suspend'?'Le compte perdra son accès en ligne et ses notifications seront désactivées. Son budget restera conservé.':'Le compte pourra de nouveau se connecter. Il devra réactiver ses notifications depuis Clair.'}</p><p>Cette action est réelle. Elle ne sert pas à simuler un impayé.</p><form id="danger-form"><label for="confirm-email">Recopie ${esc(user.email)}</label><input id="confirm-email" type="email" autocomplete="off" required><div class="dialog-actions"><button class="danger" type="submit">${names[action]}</button></div><p class="field-hint">Une connexion datant de moins de 15 minutes est requise.</p></form>`);
    $('#danger-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api(action,{user_id:user.id,confirm_email:$('#confirm-email').value});$('#modal').close();await refresh();toast('Action effectuée.');}catch(error){e.submitter.disabled=false;dialogError(error);}};
  }
  $('#board').addEventListener('click',async e=>{
    const button=e.target.closest('[data-action]');if(!button||busy)return;
    const action=button.dataset.action,user=snapshot.users.find(u=>u.id===button.dataset.user);
    if(action==='date')return dateDialog(user);if(action==='renew')return renewDialog(user);if(['delete','suspend','restore'].includes(action))return dangerDialog(user,action);
    busy=true;button.disabled=true;try{if(action==='reopen'){const r=await api('get-mail',{id:button.dataset.id});showMail(r.message);}else if(action==='reminder'||action==='recovery'){const r=await api('prepare-mail',{user_id:user.id,id:crypto.randomUUID(),kind:action==='reminder'?'reminder':'recovery'});showMail(r.message);await refresh();}}catch(error){toast(error.message,true);}finally{busy=false;button.disabled=false;}
  });
  $('#login-form').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter;b.disabled=true;
    try{const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});$('#password').value='';if(error)throw Error('Connexion refusée. Vérifie ton adresse et ton mot de passe Clair.');await refresh();}
    catch(error){toast(error.message,true);await client.auth.signOut({scope:'local'});}
    finally{b.disabled=false;}
  };
  async function leave(){++loginEpoch;await client.auth.signOut({scope:'local'});snapshot=null;$('#board').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;$('#users').replaceChildren();$('#messages').replaceChildren();$('#audit').replaceChildren();$('#identity').textContent='';$('#modal-content').replaceChildren();$('#phone').value='';$('#modal').close();}
  $('#logout').onclick=()=>leave().catch(e=>toast(e.message,true));
  $('#refresh').onclick=()=>refresh().catch(e=>toast(e.message,true));
  $('#close-modal').onclick=()=>$('#modal').close();$('#search').oninput=renderUsers;$('#filter').onchange=renderUsers;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab+'-view');});
  $('#settings-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api('settings',{payment_phone:$('#phone').value});await refresh();toast('Coordonnées de test enregistrées.');}catch(error){toast(error.message,true);}finally{e.submitter.disabled=false;}};
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&snapshot){++loginEpoch;snapshot=null;$('#board').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;$('#modal').close();$('#users').replaceChildren();$('#messages').replaceChildren();}});
  (async()=>{try{const {data}=await client.auth.getSession();if(data.session)await refresh();}catch(error){toast(error.message,true);await leave();}})();
})();
