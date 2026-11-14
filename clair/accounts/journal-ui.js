  /* ---------- Historique : sens et origine indépendants ---------- */
  const journalState={flow:'all',kind:'all',category:'all',query:'',more:false};
  const journalFlows={all:'Tout',income:'Argent reçu',expense:'Argent dépensé'};
function journalCategories(){
 const known=[...categories,{id:'income',label:'Sans catégorie (argent reçu)',icon:'+'},...data.customCategories],seen=new Set();
 return known.filter(c=>{if(seen.has(c.id))return false;seen.add(c.id);return true;});
}
function journal(){
 const selected=value=>journalState.kind===value?' selected':'';
 return heading('Toutes tes opérations','Historique','Retrouve ton argent reçu, tes dépenses et ton épargne.',monthNav())+`<section class="journal-controls" aria-label="Rechercher et filtrer l’historique"><label class="sr-only" for="search">Rechercher une opération</label><input id="search" type="search" placeholder="Rechercher une opération" maxlength="100" value="${esc(journalState.query)}"><div class="journal-segments" role="group" aria-label="Afficher les opérations">${Object.entries(journalFlows).map(([flow,label])=>`<button type="button" data-action="journal-flow" data-flow="${flow}" aria-pressed="${journalState.flow===flow}" aria-controls="journal-results">${label}</button>`).join('')}</div><div class="journal-category"><div class="field"><label for="category-filter">Catégorie</label><select id="category-filter" aria-controls="journal-results"><option value="all">Toutes les catégories</option>${journalCategories().map(c=>`<option value="${esc(c.id)}"${journalState.category===c.id?' selected':''}>${esc(c.label)}</option>`).join('')}</select></div><button type="button" class="link" data-action="category-new">Créer une catégorie</button></div><div class="journal-options"><details id="journal-more" ${journalState.more||journalState.kind!=='all'?'open':''}><summary>Plus de filtres${journalState.kind!=='all'?' · 1 actif':''}</summary><label class="field" for="kind-filter"><span>Origine ou épargne</span><select id="kind-filter"><option value="all"${selected('all')}>Toutes les opérations</option><option value="auto"${selected('auto')}>Automatiques</option><option value="manual"${selected('manual')}>Saisies</option><option value="savings"${selected('savings')}>Épargne</option></select></label><p class="help">L’épargne apparaît dans « Tout ». Ses transferts ne sont ni des achats ni de nouveaux revenus.</p></details><button class="button primary" data-action="add" aria-label="Ajouter une dépense">${icon('plus')}Ajouter</button></div></section><section class="journal-summary" aria-label="Résumé des opérations affichées"><div id="journal-summary" role="status" aria-live="polite" aria-atomic="true"></div><button type="button" class="link" data-action="journal-reset" hidden>Effacer les filtres</button></section><div class="journal-companion" id="journal-companion" role="status" aria-live="polite" aria-atomic="true"></div><section class="card journal-list" id="journal-results" aria-label="Opérations sélectionnées"></section>`;
}
function journalFlow(flow){
 if(!Object.hasOwn(journalFlows,flow))return;
 journalState.flow=flow;
 for(const key of Object.keys(journalFlows))$('[data-flow="'+key+'"]').setAttribute?.('aria-pressed',String(flow===key));
 journalResults();
}
function journalReset(){
 Object.assign(journalState,{flow:'all',kind:'all',category:'all',query:''});
 $('#search').value='';$('#kind-filter').value='all';$('#category-filter').value='all';journalFlow('all');
}
function journalSummary(list,{filters,month},{escapeHtml,money,monthLabel,categoryById}){
 const total=(type,savings)=>list.filter(t=>t.type===type&&(t.categoryId==='epargne')===savings).reduce((sum,t)=>sum+t.amountCents,0);
 const saved=total('expense',true),withdrawn=total('income',true),savings=list.some(t=>t.categoryId==='epargne');
 const label=filters.category==='all'?'Toutes les catégories':categoryById(filters.category).label;
 return `<h2>${escapeHtml(label)}</h2><p class="help">${list.length} opération${list.length===1?'':'s'} · ${escapeHtml(monthLabel(month))}</p><dl class="journal-totals">${filters.flow!=='expense'?`<div><dt>Argent reçu</dt><dd>${money(total('income',false))}</dd></div>`:''}${filters.flow!=='income'?`<div><dt>Argent dépensé</dt><dd>${money(total('expense',false))}</dd></div>`:''}</dl>${savings?`<p class="help">Épargne : ${money(saved)} mis de côté · ${money(withdrawn)} retirés. Ces mouvements sont exclus des totaux ci-dessus.</p>`:''}<p class="journal-summary-note">Totaux des opérations affichées, y compris celles à venir.</p>`;
}
// Query inputs and presentation dependencies are explicit; the controller owns no budget copy.
function selectJournalTransactions({transactions,savingsProjects,month,filters},{categoryById}){
 const query=filters.query.toLocaleLowerCase('fr').trim(),kind=filters.kind,flow=filters.flow,category=filters.category;
 const list=transactions.filter(t=>t.date.slice(0,7)===month && (category==='all'||t.categoryId===category) && (!query||(t.name+' '+(t.note||'')+' '+categoryById(t.categoryId).label+' '+(t.categoryId==='epargne'?savingsProjects.find(p=>p.id===t.savingsProjectId)?.name||'':'')).toLocaleLowerCase('fr').includes(query)) && (flow==='all'||(t.type===flow&&t.categoryId!=='epargne')) && (kind==='all'||(kind==='auto'&&t.autoKey)||(kind==='manual'&&!t.autoKey)||(kind==='savings'&&t.categoryId==='epargne'))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 return list;
}
function createJournalController({select,readModel,categoryById,summaryMarkup,companionMarkup,renderRows,now}){
 const setMarkup=(node,markup)=>{if(node&&node.innerHTML!==markup)node.innerHTML=markup;};
 function update(){
  const model=readModel(),{filters}=model,list=selectJournalTransactions(model,{categoryById});
  const host=select('#journal-results');
  renderRows(host,list);
  host.hidden=!list.length;
  const filtered=Boolean(filters.query.toLocaleLowerCase('fr').trim()||filters.kind!=='all'||filters.flow!=='all'||filters.category!=='all');
  setMarkup(select('#journal-summary'),summaryMarkup(list,model));select('[data-action="journal-reset"]').hidden=!filtered;
  setMarkup(select('#journal-companion'),companionMarkup(list,filtered,model,{now:now()}));
  const summary=select('#journal-more summary');if(summary)summary.textContent='Plus de filtres'+(filters.kind!=='all'?' · 1 actif':'');
 }
 return {update};
}
function reconcileJournalRows(host,list,transactionRow){
  const existing=new Map([...host.children].map(node=>[node.querySelector('[data-id]')?.dataset.id,node]));
  let cursor=host.firstElementChild;
  for(const transaction of list){
   const template=document.createElement('template');template.innerHTML=transactionRow(transaction);
   const fresh=template.content.firstElementChild,previous=existing.get(transaction.id);
   const node=previous&&previous.isEqualNode(fresh)?previous:fresh;
   existing.delete(transaction.id);
   if(previous&&node!==previous){if(cursor===previous)cursor=node;previous.replaceWith(node);}
   if(node!==cursor)host.insertBefore(node,cursor);
   cursor=node.nextElementSibling;
  }
  for(const node of existing.values())node.remove();
}
const journalController=createJournalController({select:$,readModel(){
 journalState.query=$('#search')?.value||'';journalState.kind=$('#kind-filter')?.value||'all';journalState.category=$('#category-filter')?.value||'all';
 return {transactions:data.transactions,savingsProjects:data.savingsProjects,month,filters:journalState,feedback:journalFeedback};
},renderRows:(host,list)=>reconcileJournalRows(host,list,txRow),categoryById:cat,summaryMarkup:(list,model)=>journalSummary(list,model,{escapeHtml:esc,money:euro,monthLabel,categoryById:cat}),companionMarkup:(list,filtered,model,context)=>journalCompanion(list,filtered,model,{...context,escapeHtml:esc}),now:()=>Date.now()});
function journalResults(){journalController.update();}

function openCategory(){
 dialog('Créer une catégorie',`<p class="help">Elle sera disponible pour tes entrées et tes dépenses, dans tout ton suivi.</p><form id="category-form">${field('Nom de la catégorie','label','','text','required maxlength="40" autofocus placeholder="Ex. Santé, Bourse…"')}${formActions('Créer')}</form>`,'category');
}
function saveCategory(f){
 const label=String(f.get('label')||'').trim().replace(/\s+/g,' '),key=label.normalize('NFKC').toLocaleLowerCase('fr');
 if(!label||label.length>40)throw Error('Choisis un nom de 1 à 40 caractères.');
 if(journalCategories().some(c=>c.label.normalize('NFKC').toLocaleLowerCase('fr')===key))throw Error('Une catégorie porte déjà ce nom. Elle existe dans la liste.');
 return commit(d=>{if(d.customCategories.length>=100)throw Error('La limite est de 100 catégories personnelles.');d.customCategories.push({id:id('category'),label,icon:'·'});},'Catégorie créée. Tu peux la choisir pour tes opérations.');
}
