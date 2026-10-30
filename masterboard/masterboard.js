(function(){
  'use strict';
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const intro=document.querySelector('#intro'),introStarted=performance.now();let introLeaving=false;
  document.querySelector('main').inert=true;
  function finishIntro(skip=false){
    if(!intro?.isConnected)return;
    const remove=()=>{intro.remove();document.querySelector('main').inert=false;};
    if(skip||motion.matches){remove();return;}
    if(introLeaving)return;introLeaving=true;
    setTimeout(()=>{if(!intro.isConnected)return;intro.classList.add('leaving');intro.addEventListener('animationend',e=>{if(e.target===intro)remove();});setTimeout(remove,1300);},Math.max(0,4200-(performance.now()-introStarted)));
  }
  setTimeout(()=>finishIntro(),6000);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&intro?.isConnected)finishIntro(true);});
  if(!window.supabase){document.body.dataset.session='ready';finishIntro(true);document.querySelector('#global-status').textContent='Connexion indisponible. Actualise la page.';return;}
  const URL='https://hkssnbvktfscizojhftl.supabase.co',KEY='sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8';
  const client=supabase.createClient(URL,KEY,{auth:{storageKey:'clair-masterboard-session-v1',storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let snapshot=null,busy=false,toastTimer,loginEpoch=0,openProfileId=null;
  const openTestTools=new Set();
  const icons={"people":"<circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1\"/>","mail":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"4\"/><path d=\"m4 7 8 6 8-6\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 7v5l3 2\"/>","key":"<circle cx=\"8\" cy=\"9\" r=\"5\"/><path d=\"m12 13 8 8m-5-5 3-3m-1 5 3-3\"/>","pause":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M9.5 8v8M14.5 8v8\"/>","play":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m10 8 6 4-6 4Z\"/>","trash":"<path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7\"/>","shield":"<path d=\"m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z\"/><path d=\"m8.5 12 2.5 2.5 4.5-5\"/>","chevron":"<path d=\"m6 9 6 6 6-6\"/>","eye":"<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","refresh":"<path d=\"M20 7v5h-5M4 17v-5h5\"/><path d=\"M6.1 6.1a8 8 0 0 1 13.3 3.4M17.9 17.9a8 8 0 0 1-13.3-3.4\"/>","settings":"<path d=\"M4 7h16M4 17h16\"/><circle cx=\"9\" cy=\"7\" r=\"3\" fill=\"currentColor\"/><circle cx=\"15\" cy=\"17\" r=\"3\" fill=\"currentColor\"/>","search":"<circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m16 16 4.5 4.5\"/>","help":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01\"/>"};
  function icon(name,cls=''){return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||''}</svg>`;}
  document.querySelectorAll('[data-icon]').forEach(node=>node.innerHTML=icon(node.dataset.icon));
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
    try{const data=await api('snapshot');if(epoch!==loginEpoch)return;const first=!snapshot;snapshot=data;$('#login').hidden=true;$('#board').hidden=false;$('#logout').hidden=false;$('#identity').textContent=data.actor.email;$('#phone').value=data.settings.payment_phone;setHero(true);render();if(first&&!motion.matches)$('#board').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:600,easing:'cubic-bezier(.22,1,.36,1)'});}
    finally{$('#refresh').disabled=false;}
  }
function setHero(signedIn){
  document.body.dataset.auth=signedIn?'on':'off';
  $('#hero-eyebrow').textContent=signedIn?'CLAIR, CÔTÉ COULISSES.':'L’ESSENTIEL, SIMPLEMENT.';
  $('#hero-title').innerHTML=signedIn?'Tout est là.':'Tout Clair,<br>en un regard.';
  $('#hero-description').innerHTML=signedIn?'Moins de bruit. Plus de clarté.<br>Tes comptes et leurs actions, au même endroit.':'Les comptes, les accès, les relances.<br>Un espace pour tout retrouver.';
}
  function render(){
    const s=snapshot;
    $('#stats').innerHTML=[['Comptes Clair',s.users.length,s.users.filter(u=>u.confirmed).length+' adresses confirmées','people','all','Voir les comptes'],['À relancer',s.users.filter(due).length,'Échéances de test','clock','due','Voir les comptes à relancer'],['Mails confirmés',s.messages.filter(m=>m.state==='confirmed_sent').length,'Sur les 100 derniers messages','mail','messages','Voir l’historique']].map(([title,n,detail,glyph,target,link],i)=>`<button class="stat ${i===0?'stat-main':''}" data-destination="${target}" aria-label="${link} : ${n}"><span class="stat-heading"><span>${title}</span>${icon(glyph)}</span><strong>${String(n).padStart(2,'0')}</strong><small>${detail}</small><span class="stat-link"><span class="stat-link-full">${link}</span><span class="stat-link-short" aria-hidden="true">Voir</span><span aria-hidden="true"> →</span></span></button>`).join('');
    renderUsers();renderHelp();
    $('#messages').innerHTML=s.messages.length?s.messages.map(m=>`<article class="mail-card"><div><span class="tag ${m.state==='confirmed_sent'?'':'neutral'}">${esc(states[m.state])}</span><h3>${esc(m.subject)}</h3><p>${esc(m.email)} · ${esc(day(m.created_at))}</p></div><button data-action="reopen" data-id="${esc(m.id)}">Reprendre le message ↗</button></article>`).join(''):'<p class="empty">Aucun message préparé. Ouvre le profil d’un compte, puis choisis « Préparer une relance ».</p>';
    $('#audit').innerHTML=s.audit.length?s.audit.map(a=>`<div class="audit-row"><span>${esc(auditNames[a.action]||a.action)}</span><time>${esc(day(a.created_at))}</time></div>`).join(''):'<p class="muted small">Les actions d’administration apparaîtront ici.</p>';
  }
function pendingHelp(email){return (snapshot.requests||[]).filter(r=>r.status==='pending'&&r.email.toLowerCase()===email.toLowerCase());}
function renderHelp(){
 const requests=snapshot.requests||[],pending=requests.filter(r=>r.status==='pending');
 $('#help-count').textContent=String(pending.length);
 const reasons={email_missing:'Lien non reçu par e-mail',link_expired:'Lien expiré ou inutilisable',access_problem:'Problème de connexion'};
 $('#help-requests').innerHTML=requests.length?requests.map(r=>{
  const user=snapshot.users.find(u=>u.email.toLowerCase()===r.email.toLowerCase());
  return `<article class="help-card"><span class="tag ${r.status==='pending'?'amber':''}">${r.status==='pending'?'À vérifier':r.status==='authorized'?'Réinitialisation autorisée':'Demande traitée'}</span><p>${esc(r.email)}</p><small>${esc(reasons[r.reason]||'Demande d’aide')} · ${esc(day(r.created_at))}</small><div>${user?`<button data-action="request-profile" data-user="${esc(user.id)}">Ouvrir le profil ↗</button>`:'<p class="field-hint">Vérifie cette adresse avec la personne avant toute action.</p>'}${r.status!=='closed'?`<button data-action="close-help" data-id="${esc(r.id)}">Marquer comme traitée</button>`:''}</div></article>`;
 }).join(''):'<p class="empty">Aucune demande pour le moment.</p>';
}
const mobileProfile=window.matchMedia('(max-width: 760px)');
let profileAnimation=null,profileReturnId=null;
function initialsFor(user){return (user.name||user.email).split(/\s+/).filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();}
function renderUsers(){
 if(!snapshot)return;
 const search=$('#search').value.trim().toLowerCase(),filter=$('#filter').value;
 const users=snapshot.users.filter(u=>(u.name+' '+u.email).toLowerCase().includes(search)&&(filter==='all'||filter==='due'&&due(u)||filter==='banned'&&u.banned||filter==='help'&&pendingHelp(u.email).length));
 if(openProfileId&&!users.some(u=>u.id===openProfileId))closeProfile(false,false);
 $('#accounts-count').textContent=String(users.length).padStart(2,'0');
 $('#users').innerHTML=users.length?users.map(u=>{
  const id=esc(u.id),open=u.id===openProfileId;
  return '<article class="user-card" data-expanded="'+open+'"><button class="profile-toggle" id="profile-'+id+'" data-profile="'+id+'" aria-expanded="'+open+'" aria-controls="profile-drawer" aria-haspopup="dialog"><span class="card-person"><span class="avatar" aria-hidden="true">'+esc(initialsFor(u))+'</span><span class="profile-identity"><span class="user-name">'+esc(u.name||'Compte Clair')+'</span><span class="user-email">'+esc(u.email)+'</span></span></span><span class="card-badges"><span class="profile-status '+(u.banned?'suspended':'')+'"><i class="status-dot"></i>'+(u.banned?'Suspendu':'Accès gratuit')+'</span>'+(u.is_admin?'<span class="admin-label">ADMIN</span>':'')+(pendingHelp(u.email).length?'<span class="tag amber">Demande d’aide</span>':'')+'</span><span class="card-foot"><span>'+esc(u.test_until?label(u):'Espace personnel')+'</span><span class="card-open">Voir le profil '+icon('chevron','profile-chevron')+'</span></span></button></article>';
 }).join(''):'<p class="empty">Aucun compte ne correspond à cette recherche.</p>';
 if(openProfileId)renderProfile();
}
function renderProfile(){
 const u=snapshot?.users.find(u=>u.id===openProfileId);if(!u)return;const id=esc(u.id);
 $('#profile-content').innerHTML='<section class="drawer-identity"><span class="avatar" aria-hidden="true">'+esc(initialsFor(u))+'</span><h2 id="profile-title">'+esc(u.name||'Compte Clair')+'</h2><p class="drawer-email">'+esc(u.email)+'</p><div class="profile-summary"><span class="tag '+(u.banned?'red':'success')+'">'+(u.banned?'Compte suspendu':'Accès gratuit')+'</span><span class="tag">'+(u.confirmed?'E-mail confirmé':'E-mail à confirmer')+'</span>'+(u.is_admin?'<span class="tag">Administrateur</span>':'')+'</div></section><div class="profile-details-inner"><h3 class="profile-section-heading"><span>'+icon('people')+'</span>Les informations du compte</h3><dl class="profile-facts"><div><dt>Inscrit le</dt><dd>'+esc(day(u.created_at))+'</dd></div><div><dt>Dernière connexion</dt><dd>'+esc(day(u.last_sign_in_at))+'</dd></div><div><dt>Échéance de test</dt><dd>'+esc(day(u.test_until))+' <span class="tag '+(due(u)?'amber':'')+'">'+esc(label(u))+'</span></dd></div></dl><h3 class="profile-section-heading"><span>'+icon('mail')+'</span>Relances et connexion</h3><div class="profile-main-actions"><button class="action-tile primary" data-action="reminder" data-user="'+id+'">'+icon('mail')+'<span><strong>Préparer une relance</strong><small>Un message prêt à envoyer dans Gmail</small></span></button><button class="action-tile" data-action="reset" data-user="'+id+'">'+icon('key')+'<span><strong>Faire sauter le mot de passe</strong><small>La personne choisira le nouveau dans Clair</small></span></button></div><details class="test-tools" data-user="'+id+'" '+(openTestTools.has(u.id)?'open':'')+'><summary>'+icon('clock')+'Outils de simulation et d’aide</summary><div class="test-actions"><button data-action="renew" data-user="'+id+'">Simuler 1 mois payé</button><button data-action="date" data-user="'+id+'">Tester l’échéance</button><button data-action="recovery" data-user="'+id+'">Envoyer le guide de connexion</button></div></details>'+(u.is_admin?'<p class="protected-account">'+icon('shield')+'Ton compte administrateur est protégé.</p>':'<section class="account-management"><h3>Gérer l’accès à Clair</h3><div><button data-action="'+(u.banned?'restore':'suspend')+'" data-user="'+id+'">'+icon(u.banned?'play':'pause')+(u.banned?'Rétablir le compte':'Suspendre le compte')+'</button><button class="danger" data-action="delete" data-user="'+id+'">'+icon('trash')+'Supprimer</button></div></section>')+'</div>';
}
function syncProfileDialog(){
 const drawer=$('#profile-drawer'),wasOpen=drawer.open;profileAnimation?.cancel();profileAnimation=null;drawer.inert=false;
 if(!wasOpen){if(mobileProfile.matches)drawer.showModal();else drawer.show();}
 drawer.setAttribute('aria-modal',String(mobileProfile.matches));document.body.dataset.profileOpen='true';
 if(!wasOpen)$('#close-profile').focus({preventScroll:true});
}
function toggleProfile(id){
 if(openProfileId===id){closeProfile();return;}
 profileAnimation?.cancel();profileAnimation=null;openProfileId=id;profileReturnId=id;renderUsers();syncProfileDialog();$('#profile-content').scrollTop=0;
}
function closeProfile(restoreFocus=true,animate=true){
 const drawer=$('#profile-drawer'),returnId=profileReturnId;openProfileId=null;document.body.dataset.profileOpen='false';
 document.querySelectorAll('[data-profile]').forEach(b=>{b.setAttribute('aria-expanded','false');b.closest('.user-card').dataset.expanded='false';});
 profileAnimation?.cancel();profileAnimation=null;
 const finish=()=>{if(openProfileId)return;drawer.close();drawer.inert=false;$('#profile-content').replaceChildren();if(restoreFocus)document.getElementById('profile-'+returnId)?.focus({preventScroll:true});};
 if(drawer.open&&animate&&!motion.matches){drawer.inert=true;profileAnimation=drawer.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX(70px)'}],{duration:240,easing:'ease-in',fill:'forwards'});profileAnimation.finished.then(finish).catch(()=>{});}else finish();
}
function resizeProfile(){
 $('.tabs').setAttribute('aria-orientation',mobileProfile.matches?'horizontal':'vertical');
 const drawer=$('#profile-drawer');if(!drawer.open||!openProfileId)return;
 drawer.close();if(mobileProfile.matches)drawer.showModal();else drawer.show();drawer.setAttribute('aria-modal',String(mobileProfile.matches));
}
mobileProfile.addEventListener('change',resizeProfile);
  function modal(html){$('#modal-content').innerHTML=html+'<p class="dialog-error" role="alert"></p>';if(!$('#modal').open)$('#modal').showModal();}
  const dialogError=e=>{const node=$('.dialog-error');if(node)node.textContent=e.message||String(e);else toast(e.message||String(e),true);};
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
    modal(`<h2 id="modal-title">${names[action]}</h2><p>${action==='delete'?'Le compte, son budget en ligne et ses appareils de notification seront supprimés. Il pourra ensuite se réinscrire avec cette adresse. Cette action est irréversible.':action==='suspend'?'Les nouveaux ajouts seront bloqués, y compris sur un appareil déjà connecté. Le compte affichera « Paie ton abonnement pour continuer ». Son budget restera conservé et ses notifications seront désactivées.':'Le compte pourra de nouveau se connecter. Il devra réactiver ses notifications depuis Clair.'}</p><p>Cette action est réelle. Elle ne sert pas à simuler un impayé.</p><form id="danger-form"><label for="confirm-email">Recopie ${esc(user.email)}</label><input id="confirm-email" type="email" autocomplete="off" required><div class="dialog-actions"><button class="danger" type="submit">${names[action]}</button></div><p class="field-hint">Une connexion datant de moins de 15 minutes est requise.</p></form>`);
    $('#danger-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api(action,{user_id:user.id,confirm_email:$('#confirm-email').value});$('#modal').close();await refresh();toast('Action effectuée.');}catch(error){e.submitter.disabled=false;dialogError(error);}};
  }
function resetDialog(user){
 const requests=(snapshot.requests||[]).filter(r=>r.device_unlock_pending&&r.status==='pending'&&r.email.toLowerCase()===user.email.toLowerCase());
 if(!requests.length){modal('<span class="section-kicker">DÉBLOCAGE DANS CLAIR</span><h2 id="modal-title">Il manque la demande de son appareil.</h2><p>La personne ouvre Clair et appuie sur « Demander un déblocage administrateur ». Sa demande apparaîtra ici. Tu pourras ensuite faire sauter son ancien mot de passe ; elle choisira le nouveau directement dans son application.</p><p>Aucun lien ni code à transmettre. Ses dépenses et son historique restent conservés.</p>');return;}
 modal(`<span class="section-kicker">DÉBLOCAGE DANS CLAIR</span><h2 id="modal-title">Faire sauter le mot de passe</h2><p>L’ancien mot de passe sera désactivé. La personne choisira le nouveau directement dans Clair sur l’appareil que tu autorises. Son historique reste conservé.</p><form id="authorize-reset-form"><label for="unlock-request">Appareil à débloquer</label><select id="unlock-request">${requests.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.device_label)+' · '+esc(day(r.created_at))+'</option>').join('')}</select><label for="reset-confirm-email">Recopie ${esc(user.email)}</label><input id="reset-confirm-email" type="email" autocomplete="off" required><p class="field-hint">En validant, tu confirmes que cette demande et cet appareil appartiennent au titulaire du compte.</p><div class="dialog-actions"><button type="submit" class="primary">Faire sauter le mot de passe</button></div><p class="field-hint">Connexion administrateur de moins de 15 minutes requise. Le titulaire dispose ensuite de 15 minutes pour choisir son nouveau mot de passe.</p></form>`);
 const input=$('#reset-confirm-email');
 input.oninput=()=>{input.setCustomValidity('');$('.dialog-error').textContent='';};
 $('#authorize-reset-form').onsubmit=async e=>{
  e.preventDefault();if(input.value.trim().toLowerCase()!==user.email.trim().toLowerCase()){input.setCustomValidity('Recopie exactement l’adresse affichée au-dessus.');input.reportValidity();return;}
  const button=e.submitter,epoch=loginEpoch;button.disabled=true;
  try{
   const r=await api('authorize-reset',{user_id:user.id,confirm_email:input.value,request_id:$('#unlock-request').value});
   if(epoch!==loginEpoch||!snapshot)return;
   modal('<span class="section-kicker">COMPTE DÉBLOQUÉ</span><h2 id="modal-title">L’ancien mot de passe est désactivé.</h2><p>La personne peut maintenant choisir son nouveau mot de passe dans Clair sur <strong>'+esc(r.device_label)+'</strong>.</p><p>Tu n’as aucun lien ni code à lui envoyer. Elle retrouve son compte et son historique après avoir défini son nouveau mot de passe.</p>');
   refresh().catch(()=>toast('Le déblocage est autorisé. Actualise la liste des comptes.',true));
  }catch(error){dialogError(error);}finally{button.disabled=false;}
 };
}
function showView(name,scroll=true){
 if(!['accounts','messages','settings'].includes(name))return;
 closeProfile(false,false);
 document.querySelectorAll('[data-tab]').forEach(t=>{const selected=t.dataset.tab===name;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
 document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==name+'-view');
 if(scroll)document.getElementById(name+'-view').scrollIntoView({behavior:motion.matches?'auto':'smooth',block:'start'});
}
function clearBoard(){
 closeProfile(false,false);
 snapshot=null;openProfileId=null;openTestTools.clear();$('#board').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;
 for(const id of ['users','messages','audit','help-requests','modal-content'])$('#'+id).replaceChildren();
 $('#identity').textContent='';$('#phone').value='';$('#password').value='';$('#modal').close();setHero(false);
}
  async function handleBoardClick(e){
    const destination=e.target.closest('[data-destination]');if(destination){const target=destination.dataset.destination;if(target==='messages')showView('messages');else{$('#search').value='';$('#filter').value=target;renderUsers();showView('accounts');}return;}
    const profile=e.target.closest('[data-profile]');if(profile){toggleProfile(profile.dataset.profile);return;}
    const button=e.target.closest('[data-action]');if(!button||busy)return;
    const action=button.dataset.action,user=snapshot.users.find(u=>u.id===button.dataset.user);
    if(action==='request-profile'){$('#search').value=user.email;$('#filter').value='all';renderUsers();if(openProfileId!==user.id)toggleProfile(user.id);return;}
    if(action==='reset')return resetDialog(user);
    if(action==='close-help'){button.disabled=true;try{await api('close-help',{id:button.dataset.id});await refresh();toast('Demande marquée comme traitée.');}catch(error){toast(error.message,true);}finally{button.disabled=false;}return;}
    if(action==='date')return dateDialog(user);if(action==='renew')return renewDialog(user);if(['delete','suspend','restore'].includes(action))return dangerDialog(user,action);
    busy=true;button.disabled=true;try{if(action==='reopen'){const r=await api('get-mail',{id:button.dataset.id});showMail(r.message);}else if(action==='reminder'||action==='recovery'){const r=await api('prepare-mail',{user_id:user.id,id:crypto.randomUUID(),kind:action==='reminder'?'reminder':'recovery'});showMail(r.message);await refresh();}}catch(error){toast(error.message,true);}finally{busy=false;button.disabled=false;}
  }
  $('#board').addEventListener('click',handleBoardClick);
  $('#profile-drawer').addEventListener('click',handleBoardClick);
  $('#login-form').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter;b.disabled=true;$('#login').dataset.busy='true';
    try{const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});$('#password').value='';if(error)throw Error('Connexion refusée. Vérifie ton adresse et ton mot de passe Clair.');await refresh();}
    catch(error){toast(error.message,true);await client.auth.signOut({scope:'local'});}
    finally{b.disabled=false;$('#login').dataset.busy='false';}
  };
  async function leave(){++loginEpoch;await client.auth.signOut({scope:'local'});clearBoard();}
  $('#logout').onclick=()=>leave().catch(e=>toast(e.message,true));
  $('#refresh').onclick=()=>refresh().catch(e=>toast(e.message,true));
  $('#close-modal').onclick=()=>$('#modal').close();$('#search').oninput=renderUsers;$('#filter').onchange=renderUsers;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showView(b.dataset.tab));
  $('.tabs').addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],i=tabs.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+tabs.length)%tabs.length;showView(tabs[next].dataset.tab,false);tabs[next].focus();});
  $('#trial-details').onclick=()=>showView('settings');
  $('#password-toggle').onclick=()=>{const visible=$('#password').type==='password';$('#password').type=visible?'text':'password';$('#password-toggle').setAttribute('aria-pressed',String(visible));$('#password-toggle').setAttribute('aria-label',visible?'Masquer le mot de passe':'Afficher le mot de passe');};
  $('#profile-drawer').addEventListener('toggle',e=>{if(e.target.matches('.test-tools')){if(e.target.open)openTestTools.add(e.target.dataset.user);else openTestTools.delete(e.target.dataset.user);}},true);
  $('#close-profile').onclick=()=>closeProfile();
  $('#profile-drawer').addEventListener('cancel',e=>{e.preventDefault();closeProfile();});
  $('#profile-drawer').addEventListener('click',e=>{if(e.target!==$('#profile-drawer'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeProfile();});
  $('#profile-drawer').addEventListener('close',()=>{if(!$('#profile-drawer').open){openProfileId=null;document.body.dataset.profileOpen='false';$('#profile-content').replaceChildren();document.querySelectorAll('[data-profile]').forEach(b=>{b.setAttribute('aria-expanded','false');b.closest('.user-card').dataset.expanded='false';});}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open&&openProfileId){e.preventDefault();closeProfile();}});
  resizeProfile();
  $('#modal').addEventListener('close',()=>{if(!$('#modal').open)$('#modal-content').replaceChildren();});
  Object.assign(auditNames,{reset_authorization_requested:'Réinitialisation demandée',reset_authorized:'Ancienne autorisation de récupération',device_unlock_approved:'Application débloquée — ancien mot de passe désactivé',help_request_closed:'Demande d’aide traitée'});

  $('#settings-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api('settings',{payment_phone:$('#phone').value});await refresh();toast('Coordonnées de test enregistrées.');}catch(error){toast(error.message,true);}finally{e.submitter.disabled=false;}};
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&snapshot){++loginEpoch;clearBoard();}});
  (async()=>{try{const {data}=await client.auth.getSession();if(data.session)await refresh();}
   catch(error){toast(error.message,true);await leave();}
   finally{document.body.dataset.session='ready';finishIntro();}
  })();
})();
