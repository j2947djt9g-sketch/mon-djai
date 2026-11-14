  /* ---------- Dépense Express : le budget courant, une saisie à la fois ---------- */
  let expressSession=null;
  function expressContext(){
    return {key:KEY,userId:cloud.user?.id||null,epoch:cloud.epoch||0,currency:data.currency,currencyRevision:data.currencyRevision||0};
  }
  function expressSameContext(context){return JSON.stringify(context)===JSON.stringify(expressContext());}
  function expressCanonical(value){
    if(Array.isArray(value))return value.map(expressCanonical);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,expressCanonical(value[key])]));
    return value;
  }
  // Normalize drops transport-only cloud ACK metadata; sorted keys tolerate serialization order.
  function expressPayloadFingerprint(){return JSON.stringify(expressCanonical(E.normalize(data)));}
  function expressTransactionFingerprint(transactionId){
    return JSON.stringify(expressCanonical(E.normalize(data).transactions.find(transaction=>transaction.id===transactionId)));
  }
  function expressCorrectionValid(){
    const correction=modal?.expressCorrection;if(!correction)return true;
    return expressSameContext(correction.context)&&data.transactions.some(transaction=>transaction.id===correction.id)&&expressTransactionFingerprint(correction.id)===correction.fingerprint;
  }
  function expressReset(){expressSession=null;}
  function expressRefresh(){
    const session=expressSession;if(!session)return;
    // A save may render synchronously; its own payload change must not destroy the draft.
    if(expressSameContext(session.context)){
      if(session.saving)return;
      const fingerprint=expressPayloadFingerprint();
      if(fingerprint===session.fingerprint){session.snapshot=snapshot;return;}
    }
    expressReset();if(modal?.kind==='express')close();
    notify('Ton budget a changé. Rouvre Dépense Express pour continuer.');
  }
  function expressHomeAction(){return '<button type="button" class="button express-home" data-action="express-open">Dépense Express</button>';}
  function expressCategoryList(){
    const result=[],seen=new Set();
    for(const category of [...categories,...(data.customCategories||[]),{id:'non-classee',label:'Non classée',icon:'·'}]){
      if(!E.safeId(category.id)||['income','epargne'].includes(category.id)||seen.has(category.id))continue;
      seen.add(category.id);result.push(category);
    }
    return result;
  }
  function expressCategoryLabel(categoryId){return expressCategoryList().find(category=>category.id===categoryId)?.label||'Non classée';}
  function expressSuggestion(rawAmount){
    const fallback={categoryId:'non-classee',confidence:'none',sampleCount:0};
    try{
      const amountCents=E.cents(rawAmount,data.currency);if(amountCents<=0)return fallback;
      const ids=expressCategoryList().map(category=>category.id);
      const suggestion=window.ClairExpressInsights.suggestCategory(data,amountCents,ids,{asOf:E.today()});
      return ids.includes(suggestion.categoryId)?suggestion:fallback;
    }catch{return fallback;}
  }
  function expressSuggestionCopy(rawAmount,selectedCategory){
    if(selectedCategory)return 'Catégorie choisie : '+expressCategoryLabel(selectedCategory)+'.';
    const suggestion=expressSuggestion(rawAmount);
    return suggestion.confidence==='none'?'Sans suggestion fiable : Non classée.':'Suggestion de ton historique : '+expressCategoryLabel(suggestion.categoryId)+'. Tu peux la modifier.';
  }
  function expressShortcuts(){
    const frequent=window.ClairExpressInsights.frequentAmounts(data,{asOf:E.today(),limit:4});
    const defaults=E.currencies[data.currency].digits===0?[10000,50000,250000]:[50,300,2500];
    const values=[...frequent.map(item=>item.amountCents),...defaults].filter((value,index,list)=>list.indexOf(value)===index).slice(0,4);
    return `<div class="express-shortcuts" role="group" aria-label="Raccourcis de montant">${values.map(value=>`<button type="button" class="button small" data-action="express-amount" data-request-id="${esc(expressSession.id)}" data-cents="${value}">${esc(E.formatMoney(value,data.currency))}</button>`).join('')}</div><p class="help express-shortcut-help">Ces raccourcis remplissent le montant, sans enregistrer.</p>`;
  }
  function expressAnalysis(){
    const thresholdCents=E.currencies[data.currency].digits===0?250000:2500;
    const summary=window.ClairExpressInsights.smallExpenseSummary(data,{asOf:E.today(),lookbackDays:30,thresholdCents});
    const threshold=E.formatMoney(thresholdCents,data.currency);
    return `<details class="express-analysis"><summary>Mes petites dépenses sur 30 jours</summary><p class="help">Dépenses de ${esc(threshold)} ou moins, du ${esc(dateLabel(summary.fromDate))} au ${esc(dateLabel(summary.toDate))}, hors automatismes et épargne.</p>${summary.count?`<p><strong>${esc(E.formatMoney(summary.totalCents,data.currency))}</strong> pour ${summary.count} dépense${summary.count>1?'s':''}.</p><ul>${summary.byCategory.map(item=>`<li><span class="category-caption">${categoryVisual(cat(item.categoryId),'sm')}${esc(expressCategoryLabel(item.categoryId))}</span><strong>${esc(E.formatMoney(item.totalCents,data.currency))}</strong></li>`).join('')}</ul>`:'<p class="help">Aucune dépense correspondante sur cette période.</p>'}</details>`;
  }
  function expressView(){
    const session=expressSession;if(!session)return;
    const request=`<input type="hidden" name="requestId" value="${esc(session.id)}">`;
    if(!window.ClairExpressCore.hasDefaultAccount(data)){
      dialog('Ton budget pour Express',`<form id="express-account-form" class="express-panel">${request}<p>Les dépenses Express seront enregistrées dans ton budget Clair courant et retirées de son solde.</p><p class="help">Tu confirmes ce choix une fois pour ce budget. Devise actuelle : ${esc(data.currency)}.</p><div class="dialog-actions"><button type="button" class="button" data-action="close">Annuler</button><button type="button" class="button primary" data-action="express-confirm-account" data-request-id="${esc(session.id)}">Utiliser mon budget Clair</button></div></form>`,'express',{requestId:session.id});
      return;
    }
    const selected=session.categoryId||'',categoryOptions=expressCategoryList().map(category=>`<option value="${esc(category.id)}"${category.id===selected?' selected':''}>${esc(category.label)}</option>`).join('');
    dialog('Dépense Express',`<form id="express-form" class="express-panel">${request}<p class="help express-context">Ton budget Clair · ${esc(data.currency)} · ${esc(dateLabel(E.today()))}. Date et heure ajoutées automatiquement.</p>${field('Montant (€)','amount',session.rawAmount,'text','inputmode="decimal" required autofocus aria-describedby="express-amount-help"')}<p id="express-amount-help" class="help">Seul le montant est nécessaire.</p>${expressShortcuts()}<details class="express-options"${selected?' open':''}><summary>Choisir une catégorie (facultatif)</summary><label class="field"><span>Catégorie</span><select name="categoryId"><option value="">Suggestion automatique</option>${categoryOptions}</select></label></details><p class="help express-suggestion" data-express-suggestion aria-live="polite">${esc(expressSuggestionCopy(session.rawAmount,selected))}</p><div class="dialog-actions"><button type="button" class="button" data-action="close">Annuler</button><button class="button primary" type="submit">Enregistrer la dépense</button></div>${expressAnalysis()}</form>`,'express',{requestId:session.id});
  }
  function openExpress(){
    if(!data.initialized){beginSetup();return;}
    if(cloud.enabled&&(!cloud.user||!cloud.ready||cloud.status==='loading')){notify('Connecte-toi avant d’utiliser Dépense Express.');return;}
    expressSession={id:id('express'),context:expressContext(),snapshot,fingerprint:expressPayloadFingerprint(),rawAmount:'',categoryId:'',createdAt:null,saving:false};
    expressView();
  }
  function expressValidSession(requestId){
    expressRefresh();
    return Boolean(expressSession&&!expressSession.saving&&expressSession.id===requestId&&modal?.kind==='express'&&modal.requestId===requestId&&$('#dialog').open);
  }
  function expressInput(target){
    const session=expressSession,form=$('#express-form');
    if(!session||!form||!form.contains(target)||!expressValidSession(session.id))return;
    const values=new FormData(form);session.rawAmount=String(values.get('amount')||'');session.categoryId=String(values.get('categoryId')||'');
    const suggestion=form.querySelector('[data-express-suggestion]');
    if(suggestion)suggestion.textContent=expressSuggestionCopy(session.rawAmount,session.categoryId);
  }
  function expressConfirmAccount(requestId){
    if(!expressValidSession(requestId)||window.ClairExpressCore.hasDefaultAccount(data))return;
    const session=expressSession;session.saving=true;
    let success=false;
    try{success=commit(d=>window.ClairExpressCore.confirmDefaultAccount(d),'',false);}
    finally{session.saving=false;}
    if(expressSession!==session)return;
    if(!success){expressRefresh();return;}
    if(!expressSameContext(session.context)){expressRefresh();return;}
    session.snapshot=snapshot;session.fingerprint=expressPayloadFingerprint();expressView();
  }
  function expressAction(button){
    const action=button.dataset.action;
    if(action==='express-open'){openExpress();return true;}
    if(!action?.startsWith('express-'))return false;
    const requestId=button.dataset.requestId;
    if(!$('#dialog').contains(button)||!expressValidSession(requestId))return true;
    if(action==='express-confirm-account'){expressConfirmAccount(requestId);return true;}
    if(action==='express-amount'){
      const form=$('#express-form'),value=Number(button.dataset.cents);
      if(!form||!Number.isSafeInteger(value)||value<=0||value>10000000000||(E.currencies[data.currency].digits===0&&value%100!==0))return true;
      const input=form.querySelector('[name="amount"]');if(!input)return true;
      input.value=E.inputAmount(value,data.currency);expressInput(input);input.focus();
    }
    return true;
  }
  function expressSubmit(form){
    if(!['express-form','express-account-form'].includes(form.id))return false;
    const values=new FormData(form),requestId=String(values.get('requestId')||'');
    // Detached forms and old buttons cannot borrow the ticket of a newly opened dialog.
    if(form!==$('#'+form.id)||!expressValidSession(requestId))return true;
    if(form.id==='express-account-form'){expressConfirmAccount(requestId);return true;}
    if(!window.ClairExpressCore.hasDefaultAccount(data))throw Error('Confirme d’abord ton budget Clair.');
    const session=expressSession,rawAmount=String(values.get('amount')||''),selectedCategory=String(values.get('categoryId')||'');
    session.rawAmount=rawAmount;session.categoryId=selectedCategory;
    const amountCents=E.cents(rawAmount,data.currency);if(amountCents<=0)throw Error('Indique un montant supérieur à zéro.');
    const validIds=expressCategoryList().map(category=>category.id);
    if(selectedCategory&&!validIds.includes(selectedCategory))throw Error('Choisis une catégorie disponible.');
    const categoryId=selectedCategory||expressSuggestion(rawAmount).categoryId;
    session.createdAt=session.createdAt||new Date().toISOString();session.saving=true;
    let result,success=false;
    try{success=commit(d=>{result=window.ClairExpressCore.addExpense(E,d,{id:session.id,rawAmount,createdAt:session.createdAt,categoryId});});}
    finally{session.saving=false;}
    if(expressSession!==session)return true;
    if(!success){expressRefresh();return true;}
    if(!expressSameContext(session.context)){expressRefresh();return true;}
    const tx=data.transactions.find(transaction=>transaction.id===result?.transaction?.id);
    if(!tx){expressReset();close();notify('Vérifie cette dépense dans Historique.');return true;}
    const context=expressContext(),fingerprint=expressTransactionFingerprint(tx.id);
    expressReset();close();
    if(typeof rememberJournalEntry==='function')rememberJournalEntry(tx.id);
    if(typeof sayCompanion==='function')sayCompanion('Dépense enregistrée !');
    notify('Dépense Express enregistrée : '+E.formatMoney(tx.amountCents,data.currency)+' · '+expressCategoryLabel(tx.categoryId)+'.',()=>{
      if(!expressSameContext(context)){notify('Ton budget a changé. Retrouve cette dépense dans son historique.');return;}
      const current=data.transactions.find(transaction=>transaction.id===tx.id);
      if(!current||expressTransactionFingerprint(tx.id)!==fingerprint){notify('Cette dépense a changé. Vérifie-la dans Historique.');return;}
      openTx(current);
      if(modal?.kind==='tx')modal.expressCorrection={id:current.id,context,fingerprint};
    },'Modifier');
    return true;
  }
