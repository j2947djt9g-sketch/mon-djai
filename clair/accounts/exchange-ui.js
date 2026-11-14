  let currencyPreviewState=null;
  function currencyError(error){const target=$('#dialog #form-error');if(target){target.textContent=error.message;target.scrollIntoView({block:'nearest'});}else notify(error.message);}
  function currencyDialog(){
    if(!data.initialized)return;
    currencyPreviewState=null;
    const available=code=>{try{E.exchangeRate(data.currency,code);return true;}catch{return false;}};
    if(!Object.keys(E.currencies).some(code=>code!==data.currency&&available(code))){dialog('Conversion indisponible',`<p class="help">Aucun taux vérifié n’est disponible pour changer la devise de ton budget (${esc(data.currency)}). Tes montants gardent leur devise actuelle.</p><div class="dialog-actions"><button type="button" class="button" data-action="close">Fermer</button></div>`,'currency');return;}
    dialog('Changer de devise',`<p class="help">Tout ton budget sera converti : solde, historique, habitudes, budgets et épargne.</p><label class="field"><span>Nouvelle devise</span><select id="currency-target">${Object.entries(E.currencies).filter(([c])=>c!==data.currency).map(([c,m])=>`<option value="${c}" ${available(c)?'':'disabled'}>${esc(m.label)}${available(c)?'':' — taux indisponible'}</option>`).join('')}</select></label><p class="notice">Taux de référence mensuels InforEuro — ${esc(E.exchangePolicy.period)} (Commission européenne). Référence comptable indicative, sans frais de change et sans cours en temps réel. <a href="https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en" target="_blank" rel="noopener noreferrer">Source officielle</a>.</p><p class="help">Arrondi au centime pour EUR/USD/GBP/MAD/CAD/CHF, au franc entier pour XOF/XAF. Une sauvegarde locale sera conservée avant la conversion. Les conversions répétées peuvent cumuler des arrondis.</p><div id="form-error" class="notice error" role="alert"></div><div class="dialog-actions"><button type="button" class="button" data-action="close">Annuler</button><button type="button" class="button primary" data-action="currency-preview">Voir la conversion</button></div>`,'currency');
  }
  function currencyPreview(){
    const asOf=E.today(),policyId=E.exchangePolicy.id,to=$('#currency-target').value,next=E.convertCurrency(data,to,asOf),before=E.balance(data,asOf),after=E.balance(next,asOf),rate=E.exchangeRate(data.currency,to);
    currencyPreviewState={to,snapshot,revision:cloud.record?.meta.revision||0,asOf,policyId};
    dialog('Vérifier la conversion',`<p class="help">${esc(E.currencies[data.currency].label)} → ${esc(E.currencies[to].label)}</p><p><strong>${esc(E.formatMoney(before,data.currency))} → ${esc(E.formatMoney(after,to))}</strong></p><p class="help">Taux : 1 ${esc(data.currency)} ≈ ${esc(new Intl.NumberFormat('fr-FR',{maximumFractionDigits:8}).format(rate))} ${esc(to)}.</p><p class="notice">Référence InforEuro — ${esc(E.exchangePolicy.period)}, valeur indicative. Ce changement convertit aussi les montants de ton historique et tes dépenses automatiques. Il ne change pas de l'argent auprès d'une banque.</p><p class="help">Les arrondis sont appliqués à chaque montant ; le solde initial est ajusté si nécessaire pour conserver le total converti affiché ci-dessus.</p><div id="form-error" class="notice error" role="alert"></div><div class="dialog-actions"><button type="button" class="button" data-action="currency-change">Retour</button><button type="button" class="button primary" data-action="currency-apply">Convertir mon budget</button></div>`,'currency-preview');
  }
  async function applyCurrency(button){
    const choice=currencyPreviewState;if(!choice||button.disabled)return;
    if(snapshot!==choice.snapshot||localStorage.getItem(KEY)!==snapshot)throw Error('Le budget a changé. Recommence l’aperçu avant de convertir.');
    if(choice.policyId!==E.exchangePolicy.id)throw Error('Les taux ont changé. Recommence l’aperçu avant de convertir.');
    if(cloud.enabled&&(navigator.onLine===false||cloud.status!=='synced'||cloud.record?.meta.dirty||cloud.busy))throw Error('Attends que ton budget soit synchronisé avant de convertir.');
    // A failed backup must block conversion, never discard the previous amounts.
    localStorage.setItem(BACKUP+'-currency',JSON.stringify(data));
    button.disabled=true;
    try{
      if(cloud.enabled)await cloud.convertCurrency(choice.to,choice.revision,choice.asOf,choice.policyId);
      else{const next=E.convertCurrency(data,choice.to,choice.asOf);if(!commit(d=>{for(const k of Object.keys(d))delete d[k];Object.assign(d,next);}))return;}
      currencyPreviewState=null;close();render();notify('Ton budget a été converti. La copie précédente reste sur cet appareil.');soundFeedback.saved();
    }finally{button.disabled=false;}
  }
  function exportCurrencyBackup(){const raw=localStorage.getItem(BACKUP+'-currency');if(!raw)throw Error('Aucune sauvegarde de conversion sur cet appareil.');download(raw,'clair-avant-conversion.json');}
