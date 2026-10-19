  /* ---------- Historique : sens et origine indépendants ---------- */
  const journalState={flow:'all',kind:'all',query:'',more:false};
  const journalFlows={all:'Tout',income:'Argent reçu',expense:'Argent dépensé'};
function journal(){
 const selected=value=>journalState.kind===value?' selected':'';
 return heading('Toutes tes opérations','Historique','Retrouve ton argent reçu, tes dépenses et ton épargne.',monthNav())+`<section class="journal-controls" aria-label="Rechercher et filtrer l’historique"><label class="sr-only" for="search">Rechercher une opération</label><input id="search" type="search" placeholder="Rechercher une opération" maxlength="100" value="${esc(journalState.query)}"><div class="journal-segments" role="group" aria-label="Afficher les opérations">${Object.entries(journalFlows).map(([flow,label])=>`<button type="button" data-action="journal-flow" data-flow="${flow}" aria-pressed="${journalState.flow===flow}" aria-controls="journal-results">${label}</button>`).join('')}</div><div class="journal-options"><details id="journal-more" ${journalState.more||journalState.kind!=='all'?'open':''}><summary>Plus de filtres${journalState.kind!=='all'?' · 1 actif':''}</summary><label class="field" for="kind-filter"><span>Origine ou épargne</span><select id="kind-filter"><option value="all"${selected('all')}>Toutes les opérations</option><option value="auto"${selected('auto')}>Automatiques</option><option value="manual"${selected('manual')}>Saisies</option><option value="savings"${selected('savings')}>Épargne</option></select></label><p class="help">L’épargne apparaît dans « Tout ». Ses transferts ne sont ni des achats ni de nouveaux revenus.</p></details><button class="button primary" data-action="add">${icon('plus')}Ajouter</button></div></section><div class="journal-companion" id="journal-companion" role="status" aria-live="polite" aria-atomic="true"></div><section class="card journal-list" id="journal-results" aria-label="Opérations sélectionnées"></section>`;
}
function journalFlow(flow){
 if(!Object.hasOwn(journalFlows,flow))return;
 journalState.flow=flow;
 for(const key of Object.keys(journalFlows))$('[data-flow="'+key+'"]').setAttribute?.('aria-pressed',String(flow===key));
 journalResults();
}
function journalResults(){
 journalState.query=$('#search')?.value||'';
 journalState.kind=$('#kind-filter')?.value||'all';
 const query=journalState.query.toLocaleLowerCase('fr').trim(),kind=journalState.kind,flow=journalState.flow;
 const list=data.transactions.filter(t=>t.date.slice(0,7)===month && (!query||(t.name+' '+(t.note||'')+' '+cat(t.categoryId).label+' '+(t.categoryId==='epargne'?data.savingsProjects.find(p=>p.id===t.savingsProjectId)?.name||'':'')).toLocaleLowerCase('fr').includes(query)) && (flow==='all'||(t.type===flow&&t.categoryId!=='epargne')) && (kind==='all'||(kind==='auto'&&t.autoKey)||(kind==='manual'&&!t.autoKey)||(kind==='savings'&&t.categoryId==='epargne'))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 $('#journal-results').innerHTML=list.map(t=>txRow(t)).join('');
 $('#journal-results').hidden=!list.length;
 const guide=$('#journal-companion');if(guide)guide.innerHTML=journalCompanion(list,Boolean(query||kind!=='all'||flow!=='all'));
 const summary=$('#journal-more summary');if(summary)summary.textContent='Plus de filtres'+(kind!=='all'?' · 1 actif':'');
}
