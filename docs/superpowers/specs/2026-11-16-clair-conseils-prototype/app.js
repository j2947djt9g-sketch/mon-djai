(() => {
  'use strict';
  function createConseilsPrototype(root) {
    const select = selector => root.querySelector(selector);
    const all = selector => [...root.querySelectorAll(selector)];
    const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
    const money = value => value === null ? 'Non renseigné' : new Intl.NumberFormat('fr-FR', {style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:2}).format(value);
    const drawings = {
      home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l3 1 2 3h4l2-3 3-1v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
      arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
      chevron:'<path d="m9 5 7 7-7 7"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
      moon:'<path d="M20.5 13A8.6 8.6 0 0 1 11 3.5 8.6 8.6 0 1 0 20.5 13Z"/>',
      sliders:'<path d="M4 6h7m5 0h4M4 12h2m5 0h9M4 18h9m5 0h2"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="15" cy="18" r="2"/>',
      up:'<path d="M12 19V5m-5 5 5-5 5 5"/>',
      down:'<path d="M12 5v14m-5-5 5 5 5-5"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      close:'<path d="m6 6 12 12M6 18 18 6"/>',
      food:'<path d="m4 8 2 12h12l2-12ZM8 8l4-6 4 6M9 12v5m6-5v5"/>',
      transport:'<rect x="4" y="3" width="16" height="16" rx="4"/><path d="M4 11h16M8 19v2m8-2v2M8 15h1m6 0h1"/>',
      other:'<path d="M3 7h6l2 2h10v11H3Z"/><path d="M3 7V4h7l2 3"/>',
      savings:'<path d="M17 8h2l2 4-2 4h-2l-1 4h-3l-1-3H8l-1 3H4l-1-5a7 7 0 0 1 8-9l3-3 1 4Z"/><path d="M7 4h4m6 7h.1"/>',
      location:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
      external:'<path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
      book:'<path d="M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Zm0 0v16"/>'
    };
    const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name] || drawings.other}</svg>`;
    const art = name => `<span class="art art-${name}" aria-hidden="true"><span class="art-fallback">${icon(name)}</span><span class="art-sprite"></span></span>`;
    const state = {layout:root.dataset.layout==='b'?'b':'a', theme:root.dataset.theme==='dark'?'dark':'light', demo:'closed', period:'oct', city:true, view:'report', foodOpen:false, transactionsOpen:false, goalOpen:false, marked:false, goalValue:'', goalTouched:false, tested:false, error:''};
    const amounts = [32, 28, 18, 24, 38, 45];
    const names = ['Courses', 'Courses', 'Repas', 'Courses', 'Courses', 'Achat alimentaire'];

    function model() {
      if (state.period === 'sep') return {period:'Septembre 2026', shortMonth:'sept.', status:'Aperçu incomplet', income:null, expenses:null, surplus:null, savings:null, food:140, comparison:false, previous:true, partial:false, nextMonth:'octobre', nextYear:2026};
      const partial = state.demo === 'partial';
      return {period:partial?'Novembre 2026':'Octobre 2026', shortMonth:partial?'nov.':'oct.', status:partial?'En cours':'Clôturé', income:1050, expenses:777, surplus:273, savings:80, food:185, comparison:state.demo==='closed', previous:false, partial, nextMonth:partial?'décembre':'novembre', nextYear:2026};
    }
    function announce(text) { select('#prototype-announcer').textContent = text; }
    function focusWithin(selector) {
      requestAnimationFrame(() => {
        const target = select(selector);
        if (!target) return;
        target.focus({preventScroll:true});
        target.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      });
    }
    function resetDetails() { Object.assign(state, {foodOpen:false, transactionsOpen:false, goalOpen:false, marked:false, goalValue:'', goalTouched:false, tested:false, error:''}); }
    function titleMarkup(m) {
      return `<header class="page-header"><div><p class="small-eyebrow">PRENDRE UN TEMPS POUR TOI</p><h1>Ton bilan du mois</h1><p class="page-header-copy">Comprendre ce qui a changé. Préparer la suite, à ton rythme.</p></div><label class="period-select">${icon('calendar')}<span class="sr-only">Mois du bilan</span><select id="period-select"><option value="sep"${state.period==='sep'?' selected':''}>Septembre 2026</option><option value="oct"${state.period==='oct'?' selected':''}>Octobre 2026</option><option value="nov"${state.period==='nov'?' selected':''}>Novembre 2026 · en cours</option></select></label></header>`;
    }
    function summaryMarkup(m) {
      const surplus = m.surplus === null ? 'Non renseigné' : '+' + money(m.surplus);
      return `<div class="summary-column"><section class="balance-card" aria-label="Synthèse du mois"><div class="balance-head"><h2>Ton solde du mois</h2><span class="status-pill">${icon(m.partial?'clock':'check')}${m.status}</span></div><strong class="balance-value ${m.surplus===null?'value-unavailable':''}" data-stat="surplus">${surplus}</strong><p class="balance-definition">Revenus − dépenses, <strong>avant épargne.</strong>${m.partial?'<br>À ce jour, du 1er au 16 novembre dans ce scénario.':''}</p><div class="cashflow-grid"><div><small>${icon('down')}Revenus</small><strong class="${m.income===null?'value-unavailable':''}" data-stat="income">${money(m.income)}</strong></div><div><small>${icon('up')}Dépenses</small><strong class="${m.expenses===null?'value-unavailable':''}" data-stat="expenses">${money(m.expenses)}</strong></div></div></section><section class="savings-strip" aria-label="Épargne identifiée du mois"><span class="savings-icon">${icon('savings')}</span><div><p>Épargne identifiée</p><small>${m.savings===null?'Pas de données dans cet aperçu':'100 € versés − 20 € retirés'}</small></div><strong data-stat="savings">${m.savings===null?'—':'+'+money(m.savings)}</strong></section></div>`;
    }
    function categoryMarkup(m) {
      const categories = m.previous ? [{name:'Alimentation', amount:140, key:'food', color:'#b59a65', share:100}] : [
        {name:'Logement', amount:460, key:'home', color:'#b5a4d6', share:59.2},
        {name:'Alimentation', amount:185, key:'food', color:'#d0b281', share:23.8},
        {name:'Transport', amount:7, key:'transport', color:'#9eafd0', share:.9},
        {name:'Autres dépenses', amount:125, key:'other', color:'#baa6cc', share:16.1}
      ];
      return `<section class="category-card" aria-labelledby="category-heading"><div class="section-card-header"><h2 id="category-heading">Où est allé ton argent ?</h2><span>${m.previous?'Aperçu':'Hors épargne'}</span></div><div class="category-list">${categories.map(c=>`<div class="category-item">${art(c.key)}<div class="category-text"><div><span>${c.name}</span><strong${c.key==='food'?' data-stat="food"':''}>${money(c.amount)}</strong></div><div class="category-track" aria-hidden="true" style="display:${m.previous?'none':'block'};--category-color:${c.color}"><span style="width:${Math.max(2,c.share)}%"></span></div></div></div>`).join('')}</div><p class="category-caption">${m.previous?'Seule l’alimentation est renseignée pour septembre dans cette maquette.':'Les 7 € de transport viennent des opérations fictives personnelles. Ce n’est pas un tarif local.'}</p></section>`;
    }
    function comparisonMarkup(m) {
      if (!m.comparison) return `<div class="data-notice">${m.partial?'Comparaison indisponible sur des périodes comparables. Le mois de novembre est en cours : aucun écart avec un mois entier n’est présenté.':m.previous?'Les autres données de septembre et le mois précédent ne sont pas renseignés dans cet aperçu.':'Pas assez d’historique comparable. Aucun pourcentage ni hausse ne peut être calculé.'}</div>`;
      return `<div class="comparison-chart" role="img" aria-label="Alimentation : septembre 140 euros, octobre 185 euros, soit 45 euros de plus et 32,1 pour cent"><div class="chart-row"><span>Septembre</span><span class="chart-track" aria-hidden="true"><span style="width:75.68%"></span></span><strong>140 €</strong></div><div class="chart-row current"><span>Octobre</span><span class="chart-track" aria-hidden="true"><span style="width:100%"></span></span><strong>185 €</strong></div><div class="chart-delta"><span>Par rapport à septembre</span><strong>+45 € · +32,1 %</strong></div></div><p class="chart-note">Deux mois du même budget, dans la même devise. Aucune moyenne nationale utilisée.</p>`;
    }
    function transactionsMarkup(m) {
      const dates = m.partial ? [2,4,7,10,13,16] : [2,7,12,16,22,26];
      if (m.previous) return `<div class="data-notice">Le détail des opérations de septembre n’est pas inclus dans cet aperçu. Le total connu reste 140 €.</div>`;
      return `<section class="transactions-panel" id="transactions-panel" aria-labelledby="transactions-heading"><h4 id="transactions-heading" class="detail-heading" tabindex="-1">Comprendre ma hausse</h4><p class="transactions-description">Voici les six opérations d’alimentation. Une dépense était ponctuelle ? Tu peux l’indiquer, sans la retirer du bilan.</p><ul class="transaction-list">${amounts.map((amount,index)=>`<li class="transaction-row ${index===5?'transaction-featured':''}"><span class="transaction-date">${dates[index]} ${m.shortMonth}</span><div class="transaction-info"><strong>${names[index]}</strong><small>Alimentation${index===5&&state.marked?' · Ponctuel, selon ton choix':''}</small></div><strong class="transaction-amount">${money(amount)}</strong>${index===5?`<label class="mark-control"><input id="mark-exceptional" type="checkbox" ${state.marked?'checked':''}><span>Cet achat de 45 € est ponctuel</span></label>`:''}</li>`).join('')}</ul><p class="transaction-total"><span>Total toujours comptabilisé</span><strong>185 €</strong></p>${state.marked?'<div class="context-callout"><strong>185 € dépensés, dont 45 € marqués ponctuels.</strong><br>Tu as ajouté un repère pour comprendre ce mois. Tes dépenses et ton solde ne changent pas.</div>':''}<button type="button" class="secondary-button" data-action="prepare-goal" aria-expanded="${state.goalOpen}" aria-controls="goal-panel">Préparer ${m.nextMonth}${icon('arrow')}</button>${state.goalOpen?goalMarkup(m):'<div id="goal-panel" hidden></div>'}</section>`;
    }
    function goalMarkup(m) {
      const suggestion = state.marked && m.comparison;
      return `<section class="goal-panel" id="goal-panel" aria-labelledby="goal-heading"><div class="goal-heading-line"><h4 id="goal-heading" tabindex="-1">Un repère pour ${m.nextMonth}</h4><span class="goal-scope">${m.nextMonth} ${m.nextYear} seulement</span></div><p class="goal-copy">${suggestion?'<strong>140 € peut servir de point de départ.</strong><br>185 € observés − 45 € que tu as marqués ponctuels = 140 €, comme en septembre. Deux mois ne suffisent pas à connaître tes besoins futurs : ce repère reste à ajuster.':'Choisis un repère si tu en as envie. Les données disponibles ne permettent pas de proposer un montant fiable automatiquement.'}</p><form id="goal-form" class="goal-form" novalidate><label for="goal-amount">${suggestion?'Ton repère, à ajuster':'Choisir mon repère'} · Alimentation</label><div class="amount-field"><input type="number" id="goal-amount" name="goal-amount" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${escape(state.goalValue)}" placeholder="Montant libre" aria-describedby="goal-help${state.error?' goal-error':''}" ${state.error?'aria-invalid="true"':''}><span aria-hidden="true">€</span></div><p id="goal-help" class="chart-note">Facultatif · aucune dépense créée · pas de répétition automatique</p><div class="goal-actions"><button type="button" class="text-button" data-action="keep-current">Garder 185 €</button><button type="submit" class="primary-button">Tester ce repère${icon('check')}</button></div>${state.error?`<p id="goal-error" class="goal-error" role="alert">${state.error}</p>`:''}${state.tested?`<p class="goal-message" role="status"><strong>${money(Number(state.goalValue))} pour ${m.nextMonth} ${m.nextYear} · aperçu</strong>Dans cette maquette uniquement, aucune donnée enregistrée. Ton bilan reste inchangé.</p>`:''}</form><button type="button" class="text-button" data-action="back-transactions">Revenir aux opérations</button></section>`;
    }
    function foodMarkup(m) {
      return `<article class="advice-card food-advice"><div class="advice-card-top">${art('food')}<div><p>COMPRENDRE</p><h3>Alimentation</h3></div><span class="advice-count">01</span></div><h3 class="advice-title">${m.comparison?'<span class="accent-number">45 € de plus.</span><br>Regardons ensemble.':`<span class="accent-number">${money(m.food)}</span> ${m.partial?'à ce jour.':'enregistrés.'}`}</h3><p class="advice-copy">${m.comparison?'Tes dépenses alimentaires sont passées de <strong>140 € à 185 €</strong>. Avant de changer ton objectif, prenons un instant pour regarder les opérations.':m.partial?'Le mois est encore en cours. Observe les opérations déjà notées, sans les comparer à un mois entier.':'Le montant connu est affiché. Nous attendons assez d’historique avant de parler d’une hausse ou d’une baisse.'}</p><button type="button" class="${state.foodOpen?'text-button':'primary-button'}" data-action="toggle-food" aria-expanded="${state.foodOpen}" aria-controls="food-details">${state.foodOpen?'Réduire le conseil':'Voir le conseil'}${icon(state.foodOpen?'up':'arrow')}</button>${state.foodOpen?`<div class="food-details" id="food-details"><h4 class="detail-heading" id="food-detail-heading" tabindex="-1">Ce que disent tes chiffres</h4>${comparisonMarkup(m)}<p class="advice-copy">Un mois peut être différent du précédent. Les chiffres seuls ne disent pas pourquoi : <strong>c’est toi qui connais le contexte.</strong></p><button type="button" class="text-button" data-action="show-transactions" aria-expanded="${state.transactionsOpen}" aria-controls="transactions-panel">${m.comparison?'Comprendre ma hausse':'Voir les opérations'}${icon('arrow')}</button>${state.transactionsOpen?transactionsMarkup(m):'<div id="transactions-panel" hidden></div>'}</div>`:'<div id="food-details" hidden></div>'}</article>`;
    }
    function savingsAdviceMarkup(m) {
      if (m.savings === null) return '';
      return `<article class="advice-card savings-advice"><div class="advice-card-top">${art('savings')}<div><p>GARDER LE CAP</p><h3>Ton épargne</h3></div><span class="advice-count">02</span></div><h3 class="advice-title">80 € d’épargne<br>identifiée.</h3><p class="advice-copy">Tes versements dépassent tes retraits de <strong>80 €</strong> ce mois-ci. C’est un mouvement d’épargne identifié, distinct des 273 € de solde mensuel.</p><details class="calculation-details"><summary>Voir le calcul</summary><p>100 € versés − 20 € retirés = <strong>80 € d’épargne nette identifiée.</strong><br>Le solde du mois est de 1 050 € − 777 € = 273 €, avant ces mouvements d’épargne. Aucun des deux montants ne remplace l’autre.</p></details></article>`;
    }
    function referenceMarkup() {
      return `<details class="reference-details"><summary>${icon('book')}Un repère pour préparer ton mois</summary><div class="reference-content"><p>Un guide public pour faire le point sur tes ressources et tes dépenses, sans imposer un budget universel.</p><a href="https://www.mesquestionsdargent.fr/budget/comment-faire-ses-comptes" target="_blank" rel="noopener noreferrer">Mes questions d’argent${icon('external')}</a><div class="reference-meta"><dl><dt>Organisme</dt><dd>Banque de France</dd><dt>Portée</dt><dd>France · guide documentaire</dd><dt>Publication</dt><dd>Date non indiquée</dd><dt>Lien vérifié</dt><dd>15 novembre 2026</dd><dt>Éligibilité</dt><dd>Lecture publique · aucune aide promise</dd></dl></div><p style="margin-top:11px">Cette source est documentaire. Elle n’est pas un partenaire de CLAIR et ne sert pas à juger tes dépenses.</p><p class="place-line">${icon('location')}${state.city?'Profil fictif : France · Angers':'Profil fictif : France · ville non renseignée'}${state.city?'<button type="button" data-action="remove-city">Retirer la ville</button>':''}</p></div></details>`;
    }
    function render() {
      const m = model();
      root.dataset.layout = state.layout;
      root.dataset.theme = state.theme;
      all('[data-layout-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layoutChoice===state.layout)));
      select('#theme-toggle').setAttribute('aria-pressed',String(state.theme==='dark'));
      select('#theme-toggle').setAttribute('aria-label',state.theme==='dark'?'Afficher le mode clair':'Afficher le mode sombre');
      select('[data-theme-icon]').innerHTML = icon(state.theme==='dark'?'sun':'moon');
      select('#demo-state').value = state.demo;
      select('#show-city').checked = state.city;
      const notice = m.previous?'Aperçu fictif de septembre : seule l’alimentation est connue. Les autres totaux ne sont pas supposés nuls.':m.partial?'Scénario fictif en cours · chiffres arrêtés au 16 novembre. Aucun montant futur n’est estimé.':state.demo==='missing'?'Scénario fictif : les données du mois sont disponibles, mais pas d’historique comparable.':'Scénario fictif complet · octobre est clôturé. Ces chiffres servent uniquement à explorer la proposition.';
      select('#prototype-content').innerHTML = titleMarkup(m)+`<p class="data-notice">${notice}</p><div class="local-view-tabs" role="group" aria-label="Vue du bilan"><button type="button" data-local-view="report" aria-pressed="${state.view==='report'}">Bilan</button><button type="button" data-local-view="coach" aria-pressed="${state.view==='coach'}">Conseils</button></div><div class="report-body" data-local-view="${state.view}"><section class="report-overview" aria-label="Bilan personnel">${summaryMarkup(m)}${categoryMarkup(m)}<button type="button" class="secondary-button read-coach-link" data-action="read-coach">Lire les conseils de CLAIR${icon('arrow')}</button></section><section class="coach-section" aria-labelledby="coach-heading"><div class="coach-heading"><div><h2 id="coach-heading" tabindex="-1">Les conseils de CLAIR</h2><p>${m.previous?'Un repère, avec les données disponibles.':'Deux pistes, sans pression.'}</p></div><img class="coach-mascot" src="assets/mascot.png" alt="" width="48" height="60"></div><div class="advice-grid">${foodMarkup(m)}${savingsAdviceMarkup(m)}</div>${referenceMarkup()}</section></div>`;
    }
    all('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});
    select('[data-scenario-icon]').innerHTML=icon('sliders');
    select('#dismiss-scope').innerHTML=icon('close');
    root.addEventListener('click', event => {
      const brand = event.target.closest('.brand');
      if (brand) {event.preventDefault();select('#prototype-scroll').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.scope) {select('#scope-message span').textContent=`${button.dataset.scope} n’est pas présenté dans cette maquette. Tu peux explorer le bilan et les conseils, avec des données fictives.`;select('#scope-message').hidden=false;announce('Message de périmètre de la maquette affiché.');return;}
      if (button.id === 'dismiss-scope') {select('#scope-message').hidden=true;return;}
      if (button.dataset.layoutChoice) {state.layout=button.dataset.layoutChoice;state.view='report';render();announce(`Proposition ${state.layout.toUpperCase()} affichée.`);return;}
      if (button.id === 'theme-toggle') {state.theme=state.theme==='light'?'dark':'light';render();return;}
      if (button.id === 'reset-scenario') {Object.assign(state,{demo:'closed',period:'oct',city:true,view:'report'});resetDetails();select('#scope-message').hidden=true;select('#scenario-options').open=false;render();select('#prototype-scroll').scrollTop=0;announce('Scénario fictif réinitialisé.');return;}
      if (button.dataset.localView) {state.view=button.dataset.localView;render();return;}
      const action=button.dataset.action;
      if (action==='toggle-food') {state.foodOpen=!state.foodOpen;render();if(state.foodOpen)focusWithin('#food-detail-heading');return;}
      if (action==='show-transactions') {state.transactionsOpen=true;render();focusWithin('#transactions-heading');return;}
      if (action==='prepare-goal') {state.goalOpen=true;if(state.marked&&model().comparison&&!state.goalTouched)state.goalValue='140';render();focusWithin('#goal-heading');return;}
      if (action==='keep-current') {state.goalValue='185';state.goalTouched=true;state.tested=false;state.error='';render();focusWithin('#goal-amount');return;}
      if (action==='back-transactions') {state.goalOpen=false;render();focusWithin('#transactions-heading');return;}
      if (action==='remove-city') {state.city=false;render();select('.reference-details').open=true;select('.reference-details summary').focus({preventScroll:true});announce('La ville facultative a été retirée. Aucun calcul ne change.');return;}
      if (action==='read-coach') {state.view='coach';render();focusWithin('#coach-heading');}
    });
    root.addEventListener('change', event => {
      const input=event.target;
      if (input.id==='demo-state') {state.demo=input.value;state.period=state.demo==='partial'?'nov':'oct';resetDetails();render();select('#prototype-scroll').scrollTop=0;announce('État fictif des données modifié.');}
      if (input.id==='period-select') {state.period=input.value;if(input.value==='nov')state.demo='partial';else if(state.demo==='partial')state.demo='closed';resetDetails();render();select('#prototype-scroll').scrollTop=0;announce('Mois du bilan modifié.');}
      if (input.id==='show-city') {state.city=input.checked;render();announce('Repère de ville modifié, sans effet sur les calculs.');}
      if (input.id==='mark-exceptional') {state.marked=input.checked;state.tested=false;if(!state.goalTouched)state.goalValue=state.marked&&model().comparison?'140':'';render();const checkbox=select('#mark-exceptional');checkbox?.focus({preventScroll:true});announce(state.marked?'45 euros marqués ponctuels. Le total dépensé reste 185 euros.':'Marquage annulé. Le total dépensé reste 185 euros.');}
    });
    root.addEventListener('input', event=>{if(event.target.id==='goal-amount'){state.goalValue=event.target.value;state.goalTouched=true;state.tested=false;state.error='';}});
    root.addEventListener('submit', event => {
      if(event.target.id!=='goal-form')return;
      event.preventDefault();
      state.goalValue=select('#goal-amount').value;
      const value=Number(state.goalValue);
      if(!state.goalValue||!Number.isFinite(value)||value<.01||value>10000){state.error='Choisis un montant entre 0,01 € et 10 000 € pour cet aperçu.';state.tested=false;render();focusWithin('#goal-amount');return;}
      state.error='';state.tested=true;state.goalTouched=true;render();focusWithin('#goal-heading');announce('Repère testé dans la maquette uniquement. Aucune donnée enregistrée.');
    });
    root.addEventListener('keydown', event=>{if(event.key==='Escape'){select('#scenario-options').open=false;select('#scope-message').hidden=true;}});
    const atlas=new Image();atlas.onload=()=>{root.dataset.artReady='true';};atlas.src='assets/category-atlas.webp';
    render();
  }
  const host=document.getElementById('clair-conseils-prototype');
  if(host)createConseilsPrototype(host);
})();
