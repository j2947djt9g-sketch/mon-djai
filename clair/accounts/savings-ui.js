  /* ---------- Projets d’épargne ---------- */
  const savingsKindLabels={voyage:'Voyage',etudes:'Études',securite:'Sécurité',achat:'Achat',autre:'Autre'};
  const savingsIconLabels={plane:'Avion',book:'Livre',shield:'Bouclier',bag:'Sac',heart:'Cœur',home:'Maison',star:'Étoile'};
  const savingsColorLabels={violet:'Violet',blue:'Bleu',green:'Vert',rose:'Rose',amber:'Ambre'};
  const savingsDefaultIcons={voyage:'plane',etudes:'book',securite:'shield',achat:'bag',autre:'star'};
  function savingsIcon(name){
    const paths={plane:'<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l5-5"/>',book:'<path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16"/>',shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',bag:'<rect x="4" y="6" width="16" height="16" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',heart:'<path d="M20 5c-3-3-7-1-8 1C11 4 7 2 4 5c-5 5 8 15 8 15S25 10 20 5Z"/>',home:'<path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3Z"/>',star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z"/>'};
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.star}</svg>`;
  }
  function savingsProgress(p){
    const saved=E.savingsBalance(data,p.id),percent=p.targetCents>0?Math.floor(saved/p.targetCents*1000)/10:0;
    return {saved,percent,done:p.targetCents>0&&saved>=p.targetCents,bar:Math.min(100,Math.max(0,percent))};
  }
  function savingsProgressView(p){
    const s=savingsProgress(p),percentage=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(s.percent);
    return `<div class="savings-amount"><strong>${euro(s.saved)}</strong><span>${p.targetCents?'sur '+euro(p.targetCents):'mis de côté'}</span></div><div class="savings-progress-row"><div class="savings-meter ${s.done?'complete':''}" role="progressbar" aria-label="${esc('Progression de '+p.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.bar}" aria-valuetext="${esc(p.targetCents?percentage+' % de l’objectif, '+euro(s.saved)+' sur '+euro(p.targetCents):euro(s.saved)+' mis de côté, objectif à définir')}"><span style="width:${s.bar}%"></span></div><span class="savings-percentage">${p.targetCents?percentage+' %':'—'}</span></div>${s.done?'<p class="savings-complete">Objectif atteint ✓</p>':''}`;
  }
  function savingsCard(p){
    return `<article class="savings-project color-${p.color}"><span class="savings-icon">${savingsIcon(p.icon)}</span><div class="savings-project-body"><h3><button class="savings-title" data-action="savings-detail" data-id="${esc(p.id)}">${esc(p.name)}${icon('arrow')}</button></h3>${savingsProgressView(p)}${p.targetDate?'<p class="help savings-deadline">Objectif : '+esc(dateLabel(p.targetDate))+'</p>':''}</div></article>`;
  }
  function savingsSection(compact=false){
    const projects=(data.savingsProjects||[]).filter(p=>!p.archived),archived=(data.savingsProjects||[]).filter(p=>p.archived);
    return `<section class="card savings-section" aria-labelledby="savings-title"><div class="section-head"><h2 id="savings-title">Mes projets d’épargne</h2>${compact&&projects.length>3?'<button class="link" data-nav="budget">Tout voir</button>':''}</div><div class="savings-projects">${projects.length?(compact?projects.slice(0,3):projects).map(savingsCard).join(''):'<div class="savings-empty"><span class="savings-icon">'+savingsIcon('star')+'</span><p>Un voyage, tes études, une réserve…<br>Donne un objectif à ton épargne.</p></div>'}</div><button class="button savings-new" data-action="savings-new">${icon('plus')}Nouveau projet</button>${!compact?`<p class="help savings-explanation">Une mise de côté réduit ton solde disponible. Un retrait le réaugmente. Ces mouvements ne sont pas comptés comme des achats ou de nouveaux revenus.</p>${archived.length?'<details class="settings-more"><summary>Projets archivés ('+archived.length+')</summary>'+archived.map(p=>'<div class="archived-project"><span>'+esc(p.name)+'</span><button class="link" data-action="savings-restore" data-id="'+esc(p.id)+'">Réactiver</button></div>').join('')+'</details>':''}`:''}</section>`;
  }
  function savingsProjectForm(project=null){
    if(!project&&(data.savingsProjects||[]).length>=100)throw Error('La limite est de 100 projets. Tu peux modifier un projet existant.');
    const p=project||{name:'',kind:'autre',icon:'star',color:'violet',targetCents:0,targetDate:null};
    const select=(name,values,labels,value,extra='')=>`<label class="field"><span>${{kind:'Catégorie',icon:'Icône',color:'Couleur'}[name]}</span><select name="${name}" ${extra}>${values.map(v=>'<option value="'+v+'" '+(v===value?'selected':'')+'>'+labels[v]+'</option>').join('')}</select></label>`;
    dialog(project?'Modifier mon projet':'Un nouveau projet',`<form id="savings-project-form">${field('Nom du projet','name',p.name,'text','required maxlength="80" placeholder="Ex. Voyage en Côte d’Ivoire" autofocus')}${select('kind',E.savingsKinds,savingsKindLabels,p.kind,'data-savings-kind')}<div class="form-grid">${select('icon',E.savingsIcons,savingsIconLabels,p.icon)}${select('color',E.savingsColors,savingsColorLabels,p.color)}</div><div class="form-grid">${field('Montant à atteindre (€)','target',p.targetCents?amount(p.targetCents):'','text','inputmode="decimal" required')}${field('Date cible (facultative)','targetDate',p.targetDate||'','date')}</div><p class="help">L’objectif ne déplace pas d’argent. Tu ajoutes ensuite les sommes réellement mises de côté.</p>${formActions(project?'Enregistrer le projet':'Créer le projet')}</form>`,'savings-project',{id:project?.id||null});
  }
  function savingsDetail(projectId){
    const p=data.savingsProjects.find(p=>p.id===projectId);if(!p)throw Error('Ce projet est introuvable.');
    const s=savingsProgress(p),moves=data.transactions.filter(t=>t.savingsProjectId===p.id).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    dialog(esc(p.name),`<div class="savings-detail color-${p.color}"><span class="savings-icon">${savingsIcon(p.icon)}</span>${savingsProgressView(p)}<p class="help">${p.targetCents?(s.done?'Ton objectif est atteint.':'Encore '+euro(p.targetCents-s.saved)+' pour atteindre ton objectif.'):'Définis un montant pour voir ton pourcentage.'}${p.targetDate?' Date cible : '+esc(dateLabel(p.targetDate))+'.':''}</p></div><div class="actions"><button class="button primary" data-action="savings-deposit" data-id="${esc(p.id)}">+ Mettre de côté</button><button class="button" data-action="savings-withdraw" data-id="${esc(p.id)}" ${s.saved<=0?'disabled':''}>Retirer</button><button class="link" data-action="savings-edit" data-id="${esc(p.id)}">Modifier le projet</button></div><h3 class="savings-history-title">Derniers mouvements</h3>${moves.length?moves.map(t=>`<div class="savings-history-row"><div><strong>${t.type==='income'?'Retrait':'Mise de côté'}</strong><p class="help">${esc(dateLabel(t.date))}${t.date>E.today()?' · à venir':''}${t.note?' · '+esc(t.note):''}</p></div><span>${t.type==='income'?'−':'+'}${euro(t.amountCents)}</span><button class="link" data-action="edit-tx" data-id="${esc(t.id)}">Modifier</button></div>`).join(''):'<p class="help">Aucun mouvement pour ce projet.</p>'}<p class="help">Tous les mouvements restent disponibles dans Historique.</p>${s.saved===0?'<button class="link savings-archive" data-action="savings-archive" data-id="'+esc(p.id)+'">Archiver le projet</button>':''}`,'savings-detail',{id:p.id});
  }
  function savingsMove(projectId,direction='deposit',old=null){
    const projects=data.savingsProjects.filter(p=>!p.archived||p.id===old?.savingsProjectId);
    if(projectId&&!projects.some(p=>p.id===projectId))throw Error('Ce projet est archivé ou a changé. Rouvre-le depuis tes projets.');
    if(!projects.length){savingsProjectForm();return;}
    const p=projects.find(p=>p.id===projectId)||projects[0];
    if(direction==='withdraw'&&!old&&E.savingsBalance(data,p.id)<=0)throw Error('Ce projet ne contient pas encore d’épargne à retirer.');
    dialog(old?'Corriger le mouvement':direction==='withdraw'?'Retirer de mon épargne':'Mettre de côté',`<form id="savings-move-form">${old?'<p class="help">Tu corriges le mouvement du '+esc(dateLabel(old.date))+'. Les autres mouvements sont conservés.</p>':''}<label class="field"><span>Projet</span><select name="projectId" ${old?'disabled':''}>${projects.map(x=>'<option value="'+esc(x.id)+'" '+(p.id===x.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')}</select></label>${field('Montant (€)','amount',old?amount(old.amountCents):'','text','required inputmode="decimal" autofocus')}${field('Note (facultative)','note',old?.note||'','text','maxlength="300"')}<p class="help">${direction==='withdraw'?'La somme revient dans ton disponible. Ce n’est pas un nouveau revenu.':'La somme est retirée de ton disponible et reste suivie dans ce projet.'}</p>${old?'<button type="button" class="button danger small" data-action="delete-tx" data-id="'+esc(old.id)+'">Supprimer ce mouvement</button>':''}${formActions(old?'Enregistrer la correction':direction==='withdraw'?'Retirer la somme':'Mettre de côté')}</form>`,'savings-move',{id:old?.id||null,projectId:p.id,direction});
  }
  function savingsAction(action,projectId){
    const p=data.savingsProjects.find(x=>x.id===projectId);
    if(action==='savings-new'){savingsProjectForm();return;}
    if(!p)throw Error('Ce projet est introuvable.');
    if(action==='savings-detail')savingsDetail(p.id);
    if(action==='savings-edit')savingsProjectForm(p);
    if(action==='savings-deposit')savingsMove(p.id);
    if(action==='savings-withdraw')savingsMove(p.id,'withdraw');
    if(action==='savings-restore'){if(commit(d=>{d.savingsProjects.find(x=>x.id===p.id).archived=false;},'Projet réactivé.'))close();}
    if(action==='savings-archive'){
      if(E.savingsBalance(data,p.id)!==0||data.transactions.some(t=>t.savingsProjectId===p.id&&t.date>E.today()))throw Error('Retire l’épargne et vérifie les mouvements à venir avant d’archiver ce projet.');
      confirm('Archiver ce projet ?', 'Son historique sera conservé. Tu pourras réactiver le projet depuis Budget et épargne.',()=>{if(commit(d=>{d.savingsProjects.find(x=>x.id===p.id).archived=true;},'Projet archivé.'))close();});
    }
  }
  function savingsSubmit(form,f){
    if(form.id==='savings-project-form'){
      const name=String(f.get('name')||'').trim(),targetCents=num(f.get('target')),kind=String(f.get('kind')),projectIcon=String(f.get('icon')),color=String(f.get('color')),targetDate=String(f.get('targetDate')||'');
      if(!name||name.length>80||!E.savingsKinds.includes(kind)||!E.savingsIcons.includes(projectIcon)||!E.savingsColors.includes(color)||(targetDate&&!E.validDate(targetDate)))throw Error('Vérifie le nom, le montant et les options du projet.');
      const projectId=modal.id||id('savings');
      return commit(d=>{const p=d.savingsProjects.find(x=>x.id===projectId);if(!p&&d.savingsProjects.length>=100)throw Error('La limite est de 100 projets.');const value={id:projectId,name,targetCents,kind,icon:projectIcon,color,targetDate:targetDate||null,archived:p?.archived||false};if(p)Object.assign(p,value);else d.savingsProjects.push(value);if(projectId==='savings-legacy')d.savingsGoal=targetCents/100;},'Projet enregistré.');
    }
    if(form.id==='savings-move-form'){
      const old=data.transactions.find(t=>t.id===modal.id),projectId=old?.savingsProjectId||String(f.get('projectId')||modal.projectId),p=data.savingsProjects.find(x=>x.id===projectId),n=num(f.get('amount')),withdraw=modal.direction==='withdraw';
      if(!p||(!old&&p.archived))throw Error('Choisis un projet actif.');
      if(!withdraw&&(!old||old.date<=E.today())&&n-(old?.amountCents||0)>Math.max(0,E.balance(data)))throw Error('Cette somme dépasse ton solde disponible.');
      if(withdraw&&!old&&n>E.savingsBalance(data,p.id))throw Error('Cette somme dépasse l’épargne disponible dans ce projet.');
      const tx={...(old||{}),id:old?.id||id('tx'),name:(withdraw?'Retrait — ':'Épargne — ')+p.name,type:withdraw?'income':'expense',amountCents:n,date:old?.date||E.today(),categoryId:'epargne',savingsProjectId:p.id,note:String(f.get('note')||'').trim().slice(0,300),autoKey:old?.autoKey||null,ruleId:old?.ruleId||null,corrected:Boolean(old?.autoKey)};
      const success=commit(d=>{const i=d.transactions.findIndex(t=>t.id===tx.id);if(i>=0)d.transactions[i]=tx;else d.transactions.push(tx);d.savingsProjects.find(x=>x.id===p.id).archived=false;},old?'Mouvement corrigé.':withdraw?'Épargne remise dans ton disponible.':'Somme mise de côté.');
      if(success&&!old)rememberJournalEntry(tx.id);return success;
    }
    return false;
  }
