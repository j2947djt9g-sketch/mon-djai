/* Clair Scolaire v1 : application sans serveur, données conservées dans le navigateur. */
(() => {
  "use strict";
  const STORAGE_KEY = "clair-scolaire-v1";
  const SUBJECTS = {
    english: {name:"Anglais",short:"TOEIC"},
    macro: {name:"Macroéconomie",short:"Macro"},
    excel: {name:"Excel",short:"Excel"},
    sap: {name:"SAP",short:"SAP"},
    other: {name:"Autre",short:"Autre"}
  };
  const PERIODS = [
    {id:"morning",name:"Matin",hours:"Repère : 9 h – 12 h",symbol:"☀️"},
    {id:"afternoon",name:"Après-midi",hours:"Repère : 14 h – 17 h 30",symbol:"🌤️"},
    {id:"evening",name:"Soir",hours:"Repère : 19 h – 21 h 30",symbol:"🌙"}
  ];
  const PLAN = {
    1:[
      ["mo-macro","Comprendre le cours et faire une fiche","macro","morning",90],
      ["mo-excel","Excel : tableaux et calculs de base","excel","afternoon",70],
      ["mo-english","10 mots + compréhension orale TOEIC","english","evening",35]
    ],
    2:[
      ["tu-excel","Excel : formules et entraînement","excel","morning",90],
      ["tu-sap","SAP : ERP et modules MM, PP, QM","sap","afternoon",65],
      ["tu-english","Grammaire + Reading TOEIC","english","evening",35]
    ],
    3:[
      ["we-macro","Macroéconomie : exercices et applications","macro","morning",90],
      ["we-excel","Excel : filtres, graphiques et tableaux","excel","afternoon",65],
      ["we-english","10 mots + écoute en anglais","english","evening",35]
    ],
    4:[
      ["th-excel","Excel : SI, NB.SI et SOMME.SI","excel","morning",90],
      ["th-sap","SAP : production, stocks et qualité","sap","afternoon",65],
      ["th-english","Mini-test TOEIC et correction","english","evening",35]
    ],
    5:[
      ["fr-macro","Macroéconomie : révision active","macro","morning",90],
      ["fr-excel","Excel : cas pratique agroalimentaire","excel","afternoon",70],
      ["fr-english","Vocabulaire + expression orale","english","evening",35]
    ],
    6:[
      ["sa-excel","Projet Excel de la semaine","excel","morning",90],
      ["sa-sap","Bilan SAP et petite révision","sap","afternoon",45]
    ],
    0:[]
  };

  const CHAPTERS={english:["Vocabulaire","Grammaire TOEIC","Listening","Reading","Mini-test"],macro:["PIB et croissance","Inflation","Chômage","Politiques économiques","Exercices"],excel:["Tableaux et cellules","Formules de base","SI et NB.SI","Tableaux croisés","Tableau de bord qualité"],sap:["Découvrir un ERP","Approvisionnement MM","Production PP","Qualité QM","Cas pratique"]};
  const SUBJECT_EMOJI={english:"🇬🇧",macro:"📊",excel:"📗",sap:"🏭"};
  let subjectPage="excel",introTimer;
  function courseProgress(s){const n=(CHAPTERS[s]||[]).filter((_,i)=>state.lessons[s+"-"+i]).length;return {n,total:(CHAPTERS[s]||[]).length,percent:n*20};}
  function level(){return Math.min(5,1+Math.floor(Object.keys(CHAPTERS).reduce((n,s)=>n+courseProgress(s).n,0)/5));}
  function subjectView(){
    const s=subjectPage,progress=courseProgress(s);
    const lessons=CHAPTERS[s].map((name,i)=>{const done=!!state.lessons[s+"-"+i];return '<div class="subject-chapter"><span class="chapter-index '+(done?"chapter-done":"")+'">'+(done?"✓":i+1)+'</span><div style="flex:1"><strong>'+esc(name)+'</strong><small>'+(done?"Validé":"À étudier")+'</small></div><button type="button" class="btn btn-light btn-small" data-action="toggle-lesson" data-subject="'+s+'" data-index="'+i+'">'+(done?"Annuler":"Valider")+'</button></div>';}).join("");
    const today=tasksFor(selected).filter(t=>t.subject===s);
    const mascot=document.querySelector(".sidebar-mascot .school-mascot");
    return '<section class="page"><button type="button" class="subject-back" data-action="back-home">← Retour à l’accueil</button><div class="subject-hero"><div class="subject-hero-icon">'+SUBJECT_EMOJI[s]+'</div><div><div class="eyebrow">MON PARCOURS</div><h2>'+esc(SUBJECTS[s].name)+'</h2><p>'+progress.n+' chapitre(s) validé(s) sur '+progress.total+'</p></div></div><div class="subject-progress-line"><div class="subject-progress-track"><span style="width:'+progress.percent+'%"></span></div><strong>'+progress.percent+' %</strong></div><div class="subject-mascot-banner"><div><span class="subject-level">MASCOTTE · NIVEAU '+level()+'/5</span><strong style="display:block;margin-top:5px">Chaque chapitre te fait évoluer.</strong><p>Les transformations se débloquent avec tes acquis.</p></div>'+(mascot?mascot.outerHTML:"")+'</div><div class="panel"><h2>Mes chapitres</h2>'+lessons+'</div><div class="panel"><h2>Mes tâches du jour</h2>'+(today.length?today.map(t=>taskHtml(t,selected)).join(""):'<p class="note">Aucune séance de cette matière aujourd’hui.</p>')+'<div class="subject-actions"><button type="button" class="btn btn-primary" data-action="add-subject-task" data-subject="'+s+'">'+svg("plus")+' Ajouter une séance</button></div></div><p class="bottom-note">Valide uniquement les chapitres que tu maîtrises réellement.</p></section>';
  }

  let introStep=0,introInterval;
  function endIntro(){
    clearInterval(introInterval);
    const el=document.getElementById("school-intro");
    if(!el)return;
    el.classList.add("is-exiting");
    try{sessionStorage.setItem("clair-scolaire-intro-v3","1");}catch(e){}
    setTimeout(()=>{el.classList.remove("is-visible","is-exiting");el.setAttribute("aria-hidden","true");},380);
  }
  function startIntro(){
    const el=document.getElementById("school-intro");if(!el)return;
    try{if(sessionStorage.getItem("clair-scolaire-intro-v3"))return;}catch(e){}
    introStep=0;el.classList.add("is-visible");el.setAttribute("aria-hidden","false");
    const show=()=>{el.querySelectorAll(".intro-scene").forEach(s=>s.classList.toggle("current",Number(s.dataset.scene)===introStep));el.style.setProperty("--intro-progress",((introStep+1)/6*100)+"%");};
    show();introInterval=setInterval(()=>{if(introStep<5){introStep++;show();}else clearInterval(introInterval);},1800);
  }

  const main = document.getElementById("main-view");
  const dialog = document.getElementById("task-dialog");
  const form = document.getElementById("task-form");
  const importer = document.getElementById("import-file");
  let state = load();
  let view = "today";
  let selected = localDate(new Date());
  let toastTimer;

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (data && typeof data === "object" && !Array.isArray(data)) return cleanData(data);
    } catch (error) { console.warn("Clair Scolaire : impossible de lire les données locales", error); }
    return cleanData({});
  }
  function cleanData(input) {
    const plain = v => v && typeof v === "object" && !Array.isArray(v) ? v : {};
    const done = {}, edits = {}, hidden = {};
    for(const [key,value] of Object.entries(plain(input.done)).slice(0,12000)) if(key.length<170 && value===true) done[key]=true;
    for(const [key,value] of Object.entries(plain(input.hidden)).slice(0,12000)) if(key.length<170 && value===true) hidden[key]=true;
    for(const [key,value] of Object.entries(plain(input.edits)).slice(0,3000)) if(key.length<170) {const task=cleanTask(value);if(task) edits[key]=task;}
    const extras = Array.isArray(input.extras) ? input.extras.slice(0,3000).map(cleanTask).filter(Boolean).filter(t=>validDate(t.date)) : [];
    const lessons={};for(const [k,v] of Object.entries(plain(input.lessons)))if(/^(english|macro|excel|sap)-[0-4]$/.test(k)&&v===true)lessons[k]=true;return {done,hidden,edits,extras,lessons,theme:input.theme==="dark"?"dark":"light"};
  }
  function cleanTask(t) {
    if(!t || typeof t!=="object" || typeof t.name!=="string" || !t.name.trim()) return null;
    return {
      id:String(t.id || "").slice(0,70),
      name:t.name.trim().slice(0,110),
      subject:SUBJECTS[t.subject]?t.subject:"other",
      period:PERIODS.some(p=>p.id===t.period)?t.period:"morning",
      duration:Math.min(240,Math.max(5,Number(t.duration)||30)),
      ...(typeof t.date==="string"?{date:t.date.slice(0,10)}:{})
    };
  }
  function persist() {
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
    catch(error){toast("Stockage indisponible : exporte tes données.");return false;}
  }
  function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&localDate(parseDate(s))===s;}
  function localDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
  function parseDate(s){const [y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d,12);}
  function shiftDate(s,delta){const d=parseDate(s);d.setDate(d.getDate()+delta);return localDate(d);}
  function mondayOf(s){const d=parseDate(s);const offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset);return localDate(d);}
  function formatDate(s,options){return new Intl.DateTimeFormat("fr-FR",options).format(parseDate(s));}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function svg(name){return '<svg aria-hidden="true"><use href="#i-'+name+'"></use></svg>';}
  function itemKey(date,id){return date+"|"+id;}
  function tasksFor(date) {
    const weekday=parseDate(date).getDay();
    const defaults=(PLAN[weekday]||[]).filter(row=>!state.hidden[itemKey(date,row[0])]).map(row=>{
      const original={id:row[0],name:row[1],subject:row[2],period:row[3],duration:row[4]};
      return {...original,...(state.edits[itemKey(date,row[0])]||{})};
    });
    const additions=state.extras.filter(t=>t.date===date);
    return [...defaults,...additions].sort((a,b)=>PERIODS.findIndex(p=>p.id===a.period)-PERIODS.findIndex(p=>p.id===b.period));
  }
  function isDone(date,id){return !!state.done[itemKey(date,id)];}
  function tally(date) {
    const tasks=tasksFor(date),done=tasks.filter(t=>isDone(date,t.id)).length;
    return {done,total:tasks.length,percent:tasks.length?Math.round(100*done/tasks.length):0,minutes:tasks.filter(t=>isDone(date,t.id)).reduce((sum,t)=>sum+t.duration,0)};
  }
  function toast(message){
    const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
  }
  function renderNavigation(){
    document.querySelectorAll("[data-view]").forEach(btn=>{const active=btn.dataset.view===view;btn.classList.toggle("active",active);if(active)btn.setAttribute("aria-current","page");else btn.removeAttribute("aria-current");});
    document.getElementById("topbar-date").textContent=formatDate(localDate(new Date()),{weekday:"long",day:"numeric",month:"long"});
    document.documentElement.dataset.theme=state.theme;
    document.querySelector('meta[name="theme-color"]').setAttribute("content",state.theme==="dark"?"#0c1720":"#e9f1ee");
    const use=document.querySelector('[data-action="toggle-theme"] use');
    use?.setAttribute("href",state.theme==="dark"?"#i-sun":"#i-moon");
  }
  function heading(eyebrow,title,subtitle,extra="") {
    return '<div class="page-title"><div><div class="eyebrow">'+esc(eyebrow)+'</div><h1>'+esc(title)+'</h1><p class="subheading">'+esc(subtitle)+'</p></div>'+extra+'</div>';
  }
  function dateNav() {
    return '<div class="day-control"><button type="button" class="round-btn" data-action="prev-day" aria-label="Jour précédent">'+svg("left")+'</button><button type="button" class="date-chip" data-action="reset-date">Aujourd’hui</button><button type="button" class="round-btn" data-action="next-day" aria-label="Jour suivant">'+svg("right")+'</button></div>';
  }
  function taskHtml(task,date){
    const done=isDone(date,task.id);
    return '<div class="task '+(done?"done":"")+'"><button type="button" class="task-check" data-action="check" data-date="'+esc(date)+'" data-id="'+esc(task.id)+'" aria-label="'+(done?"Marquer comme à faire : ":"Terminer : ")+esc(task.name)+'" aria-pressed="'+done+'">'+svg("check")+'</button><div class="task-body"><div class="task-name">'+esc(task.name)+'</div><div class="task-meta"><span class="subject-tag subject-'+esc(task.subject)+'">'+esc(SUBJECTS[task.subject]?.name||"Autre")+'</span><span>≈ '+Math.round(task.duration)+' min</span></div></div><button type="button" class="task-edit" data-action="edit" data-date="'+esc(date)+'" data-id="'+esc(task.id)+'" aria-label="Modifier '+esc(task.name)+'">'+svg("edit")+'</button></div>';
  }
  function periodHtml(period,date) {
    const tasks=tasksFor(date).filter(t=>t.period===period.id);
    return '<section class="period period-'+period.id+'"><div class="period-head"><div class="period-heading"><span class="period-symbol">'+period.symbol+'</span><div><h3>'+esc(period.name)+'</h3><small>'+esc(period.hours)+'</small></div></div><span class="subject-tag subject-other">'+tasks.filter(t=>isDone(date,t.id)).length+'/'+tasks.length+'</span></div><div class="task-list">'+(tasks.length?tasks.map(t=>taskHtml(t,date)).join(""):'<p class="empty-period">Aucune séance prévue. Profite de ce créneau libre.</p>')+'</div><button type="button" class="add-inline" data-action="add" data-period="'+period.id+'">'+svg("plus")+' Ajouter une séance</button></section>';
  }
  function heroHtml(date){
    const t=tally(date),isRest=t.total===0;
    const message=isRest?"Le repos fait aussi partie de ton programme.":"Avance à ton rythme. Même une petite séance compte.";
    return '<section class="hero"><div class="hero-content"><div class="eyebrow">TA JOURNÉE, SANS PRESSION</div><h2>'+(isRest?"Aujourd’hui, on souffle.":t.done===t.total?"Belle progression !":"Chaque pas compte.")+'</h2><p>'+message+'</p></div><div class="hero-stat"><div class="ring" style="--p:'+t.percent+'"><div class="ring-inner"><div><strong>'+t.percent+'%</strong><small>accompli</small></div></div></div><div class="hero-detail"><strong>'+t.done+'/'+t.total+'</strong>tâches terminées</div></div></section>';
  }
  function todayView(){
    const current=selected===localDate(new Date());
    const t=tally(selected);
    const dateLabel=formatDate(selected,{weekday:"long",day:"numeric",month:"long"});
    return '<section class="page">'+heading("MON ESPACE DE TRAVAIL",current?"Bonjour, à toi de jouer !":dateLabel,"Un planning souple. Des progrès bien réels.",'<button type="button" class="btn btn-primary" data-action="add">'+svg("plus")+' Nouvelle tâche</button>')+heroHtml(selected)+'<div class="subject-tabs">'+Object.keys(CHAPTERS).map(k=>'<button type="button" data-action="open-subject" data-subject="'+k+'">'+SUBJECT_EMOJI[k]+' '+esc(SUBJECTS[k].name)+'</button>').join('')+'</div><div class="under-hero"><div class="metric"><span class="metric-icon">✓</span><div><strong>'+t.done+' / '+t.total+'</strong><small>séances faites</small></div></div><div class="metric"><span class="metric-icon">◷</span><div><strong>'+t.minutes+' min</strong><small>temps prévu validé</small></div></div><div class="metric"><span class="metric-icon">✦</span><div><strong>4</strong><small>domaines à explorer</small></div></div></div><div class="section-line"><h2>Mon programme du '+formatDate(selected,{day:"numeric",month:"short"})+'</h2>'+dateNav()+'</div><div class="period-grid">'+PERIODS.map(p=>periodHtml(p,selected)).join("")+'</div><p class="bottom-note">Les heures sont des repères, pas des rendez-vous. Une séance ratée n’efface pas tes efforts. 🌿</p></section>';
  }
  function weekView(){
    const monday=mondayOf(selected); const dates=Array.from({length:7},(_,i)=>shiftDate(monday,i));
    const weekRange=formatDate(dates[0],{day:"numeric",month:"long"})+" au "+formatDate(dates[6],{day:"numeric",month:"long",year:"numeric"});
    const tile=dates.map(d=>{const t=tally(d);return '<button class="day-tile '+(selected===d?"active":"")+'" type="button" data-action="select-date" data-date="'+d+'"><small>'+esc(formatDate(d,{weekday:"short"}))+'</small><strong>'+parseDate(d).getDate()+'</strong><span class="dot-progress" style="opacity:'+(t.done?.96:.19)+'"></span></button>';}).join("");
    const cols=dates.map(d=>{
      const tasks=tasksFor(d);
      return '<article class="week-column '+(d===localDate(new Date())?"today":"")+'"><div class="week-column-header"><span>'+esc(formatDate(d,{weekday:"short"}))+'</span><small>'+parseDate(d).getDate()+'</small></div>'+(tasks.length?tasks.map(task=>'<div class="week-task '+(isDone(d,task.id)?"complete":"")+'">'+esc(task.name)+'<small>'+esc(PERIODS.find(p=>p.id===task.period)?.name||"")+' · '+task.duration+' min</small></div>').join(""):'<p class="week-empty">Repos, temps libre.</p>')+'<button type="button" class="week-select" data-action="open-date" data-date="'+d+'">Voir ce jour →</button></article>';
    }).join("");
    const all=dates.map(tally); const done=all.reduce((sum,t)=>sum+t.done,0),total=all.reduce((sum,t)=>sum+t.total,0);
    return '<section class="page">'+heading("MON ORGANISATION","Ma semaine","Visualise tes séances, sans rigidité.")+'<div class="section-line"><h2>'+esc(weekRange)+'</h2><div class="day-control"><button type="button" class="round-btn" data-action="prev-week" aria-label="Semaine précédente">'+svg("left")+'</button><button type="button" class="round-btn" data-action="next-week" aria-label="Semaine suivante">'+svg("right")+'</button></div></div><div class="weekday-strip">'+tile+'</div><div class="info-banner"><strong>'+done+' / '+total+' séances terminées cette semaine.</strong> Clique sur un jour pour l’ouvrir et cocher les tâches. Le dimanche est libre.</div><div class="week-grid">'+cols+'</div><p class="bottom-note">Libre de déplacer tes séances : ton planning te guide, il ne te commande pas.</p></section>';
  }
  function statsView() {
    const today=localDate(new Date());
    const dates=Array.from({length:7},(_,i)=>shiftDate(today,i-6));
    const summaries=dates.map(tally);
    const done=summaries.reduce((x,t)=>x+t.done,0),total=summaries.reduce((x,t)=>x+t.total,0);
    const minutes=summaries.reduce((x,t)=>x+t.minutes,0);
    const active=summaries.filter(t=>t.done>0).length;
    const bars=dates.map((d,i)=>'<div class="bar-col"><strong>'+summaries[i].done+'/'+summaries[i].total+'</strong><div class="bar-rail"><div class="bar-fill" style="height:'+summaries[i].percent+'%"></div></div><span>'+esc(formatDate(d,{weekday:"short"}))+'</span></div>').join("");
    const subjects=["english","macro","excel","sap","other"].map(subject=>{
      const tasks=dates.flatMap(d=>tasksFor(d).filter(t=>t.subject===subject).map(t=>({...t,date:d})));
      const doneCount=tasks.filter(t=>isDone(t.date,t.id)).length;
      return {subject,done:doneCount,total:tasks.length};
    }).filter(x=>x.total>0);
    const rows=subjects.map(t=>'<div class="subject-row"><div class="label">'+esc(SUBJECTS[t.subject].name)+'</div><div class="track"><span style="width:'+(t.total?Math.round(t.done/t.total*100):0)+'%"></span></div><span class="count">'+t.done+'/'+t.total+'</span></div>').join("");
    return '<section class="page">'+heading("TA PROGRESSION","Les petits pas comptent","Bilan réel des 7 derniers jours, à partir des cases cochées.")+'<div class="overview-cards"><div class="overview"><small>Séances réalisées</small><strong>'+done+' / '+total+'</strong><p>Sur 7 jours</p></div><div class="overview"><small>Durée indicative</small><strong>'+Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,"0")+'</strong><p>Somme des séances validées</p></div><div class="overview"><small>Jours actifs</small><strong>'+active+' / 7</strong><p>Sans pénalité pour le repos</p></div></div><div class="panel"><h2>Ton activité jour par jour</h2><div class="bars">'+bars+'</div></div><div class="panel"><h2>Progression par matière</h2><div class="subject-progress">'+(rows||'<p class="note">Aucune séance prévue sur cette période.</p>')+'</div></div><p class="bottom-note">Ces chiffres indiquent les séances cochées, pas le temps réel passé. Aucun classement, aucune pression.</p></section>';
  }
  function settingsView(){
    return '<section class="page">'+heading("PERSONNALISATION","Mes réglages","Garde le contrôle de ton espace d’études.")+'<div class="settings-grid"><div class="panel"><h2>Apparence</h2><p>Retrouve les couleurs vert forêt de Clair, en clair ou en sombre.</p><div class="setting-actions"><button class="btn '+(state.theme==="light"?"btn-primary":"btn-light")+'" type="button" data-action="theme-light">'+svg("sun")+' Clair</button><button class="btn '+(state.theme==="dark"?"btn-primary":"btn-light")+'" type="button" data-action="theme-dark">'+svg("moon")+' Sombre</button></div></div><div class="panel"><h2>Sauvegarder mes données</h2><p>Exporte un fichier JSON pour conserver tes tâches, ou importe une sauvegarde précédente.</p><div class="setting-actions"><button class="btn btn-primary" type="button" data-action="export">'+svg("download")+' Exporter</button><button class="btn btn-light" type="button" data-action="import">'+svg("upload")+' Importer</button></div></div><div class="panel"><h2>Comment ça marche ?</h2><p>Ton planning revient chaque semaine. Une modification ne concerne que la journée choisie. Les cases cochées sont propres à chaque date.</p><p>Les données restent sur <strong>ce navigateur et cet appareil</strong>. GitHub Pages n’assure aucune synchronisation entre appareils. Pour changer d’appareil, utilise l’export puis l’import.</p></div><div class="panel"><h2>Recommencer</h2><p>Réinitialiser efface toutes les coches, modifications et tâches ajoutées sur cet appareil. Tu devras confirmer avant toute suppression.</p><button class="btn btn-light danger" type="button" data-action="reset">'+svg("trash")+' Tout réinitialiser</button></div></div><p class="bottom-note">Clair Scolaire · Version 1.0 · Sans compte, sans publicité, sans frais.</p></section>';
  }
  function render(){
    renderNavigation();
    const viewMap={today:todayView,week:weekView,stats:statsView,settings:settingsView,subject:subjectView};
    main.innerHTML=(viewMap[view]||todayView)();
  }
  function openDialog(mode,date=selected,period="morning",taskId=""){
    form.reset();
    form.dataset.mode=mode;form.dataset.date=date;form.dataset.id=taskId;
    document.getElementById("task-duration").value=30;
    document.getElementById("task-period").value=period;
    document.getElementById("dialog-title").textContent=mode==="edit"?"Modifier la séance":"Nouvelle séance";
    const oldDelete=document.getElementById("dialog-delete");if(oldDelete)oldDelete.remove();const oldPostpone=document.getElementById("dialog-postpone");if(oldPostpone)oldPostpone.remove();
    if(mode==="edit"){
      const item=tasksFor(date).find(t=>t.id===taskId);if(!item)return;
      document.getElementById("task-name").value=item.name;
      document.getElementById("task-subject").value=item.subject;
      document.getElementById("task-period").value=item.period;
      document.getElementById("task-duration").value=item.duration;
      const actions=document.querySelector(".dialog-buttons");const postpone=document.createElement("button");postpone.type="button";postpone.id="dialog-postpone";postpone.className="btn btn-light";postpone.dataset.action="postpone-task";postpone.textContent="Reporter à demain";actions.prepend(postpone);const del=document.createElement("button");del.type="button";del.id="dialog-delete";del.className="btn btn-light danger";del.dataset.action="delete-task";del.textContent="Supprimer";actions.prepend(del);
    }
    dialog.showModal();
    document.getElementById("task-name").focus();
  }
  function removeTask(date,id){
    const index=state.extras.findIndex(t=>t.date===date&&t.id===id);
    if(index>=0)state.extras.splice(index,1);
    else {state.hidden[itemKey(date,id)]=true;delete state.edits[itemKey(date,id)];}
    delete state.done[itemKey(date,id)];
    persist();render();toast("Séance supprimée pour ce jour.");
  }
  function submitTask(event){
    event.preventDefault();
    const task=cleanTask({
      id:form.dataset.mode==="edit"?form.dataset.id:"extra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
      date:form.dataset.date,
      name:document.getElementById("task-name").value,
      subject:document.getElementById("task-subject").value,
      period:document.getElementById("task-period").value,
      duration:document.getElementById("task-duration").value
    });
    if(!task || !validDate(task.date)){toast("Vérifie le titre et les champs.");return;}
    if(form.dataset.mode==="edit"){
      const index=state.extras.findIndex(t=>t.date===task.date && t.id===task.id);
      if(index>=0)state.extras[index]=task;
      else state.edits[itemKey(task.date,task.id)]=task;
    }else state.extras.push(task);
    if(persist()){dialog.close();render();toast(form.dataset.mode==="edit"?"Séance mise à jour.":"Séance ajoutée.");}
  }
  function downloadBackup(){
    const exportData={app:"clair-scolaire",version:1,exportedAt:new Date().toISOString(),...state};
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="clair-scolaire-sauvegarde-"+localDate(new Date())+".json";document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast("Sauvegarde téléchargée.");
  }
  async function importBackup(file){
    if(!file)return;
    if(file.size>1024*1024){toast("Fichier trop volumineux (max. 1 Mo).");return;}
    try{
      const data=JSON.parse(await file.text());
      if(data.app!=="clair-scolaire"||data.version!==1||!data.done||!Array.isArray(data.extras))throw Error("format");
      if(!confirm("Importer cette sauvegarde remplacera tes données locales. Continuer ?"))return;
      const previous=state;state=cleanData(data);
      if(!persist()){state=previous;return;}
      render();toast("Sauvegarde importée.");
    }catch(error){toast("Ce fichier n’est pas une sauvegarde Clair Scolaire valide.");}
    finally{importer.value="";}
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("button,[data-view]");if(!button)return;
    if(button.dataset.view){
      view=button.dataset.view;render();window.scrollTo({top:0,behavior:"smooth"});return;
    }
    const action=button.dataset.action,date=button.dataset.date||selected,id=button.dataset.id;
    switch(action){
      case "skip-intro":endIntro();break;
      case "open-subject":subjectPage=button.dataset.subject;view="subject";render();window.scrollTo({top:0,behavior:"smooth"});break;
      case "back-home":view="today";render();break;
      case "toggle-lesson":{const key=button.dataset.subject+"-"+button.dataset.index;const old=level();if(state.lessons[key])delete state.lessons[key];else state.lessons[key]=true;persist();render();if(level()>old)toast("Transformation : nouveau niveau ! ✨");break;}
      case "add-subject-task":openDialog("add",selected,"morning");document.getElementById("task-subject").value=button.dataset.subject;break;
      case "toggle-theme":case "theme-light":case "theme-dark":
        state.theme=action==="theme-light"?"light":action==="theme-dark"?"dark":state.theme==="light"?"dark":"light";
        persist();render();break;
      case "prev-day":selected=shiftDate(selected,-1);render();break;
      case "next-day":selected=shiftDate(selected,1);render();break;
      case "reset-date":selected=localDate(new Date());render();break;
      case "prev-week":selected=shiftDate(selected,-7);render();break;
      case "next-week":selected=shiftDate(selected,7);render();break;
      case "select-date":selected=date;view="today";render();window.scrollTo({top:0,behavior:"smooth"});break;
      case "open-date":selected=date;view="today";render();window.scrollTo({top:0,behavior:"smooth"});break;
      case "check":
        if(state.done[itemKey(date,id)])delete state.done[itemKey(date,id)];
        else state.done[itemKey(date,id)]=true;
        persist();render();break;
      case "add":openDialog("add",selected,button.dataset.period||"morning");break;
      case "edit":openDialog("edit",date,"morning",id);break;
      case "close-dialog":dialog.close();break;
      case "postpone-task": {
        const d=form.dataset.date,taskId=form.dataset.id,task=tasksFor(d).find(t=>t.id===taskId);
        if(!task)break;
        const next=shiftDate(d,1);
        const newTask={...task,id:"extra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),date:next};
        state.extras.push(newTask);
        const index=state.extras.findIndex(t=>t.date===d&&t.id===taskId);
        if(index>=0)state.extras.splice(index,1);
        else {state.hidden[itemKey(d,taskId)]=true;delete state.edits[itemKey(d,taskId)];}
        delete state.done[itemKey(d,taskId)];
        dialog.close();persist();render();toast("Séance reportée au "+formatDate(next,{day:"numeric",month:"long"})+".");break;
      }
      case "delete-task":
        if(confirm("Supprimer cette séance pour ce jour ?")){const d=form.dataset.date,task=form.dataset.id;dialog.close();removeTask(d,task);}
        break;
      case "export":downloadBackup();break;
      case "import":importer.click();break;
      case "reset":
        if(confirm("Effacer toutes les données Clair Scolaire stockées sur cet appareil ? Cette action est irréversible.")){
          state=cleanData({theme:state.theme});persist();selected=localDate(new Date());view="today";render();toast("Clair Scolaire réinitialisé.");
        }
        break;
    }
  });
  form.addEventListener("submit",submitTask);
  importer.addEventListener("change",e=>importBackup(e.target.files[0]));
  document.querySelectorAll(".mobile-logo,.brand").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();selected=localDate(new Date());view="today";render();}));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible" && selected===localDate(new Date()))renderNavigation();});
  if("serviceWorker" in navigator && window.isSecureContext){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  render();
  startIntro();
})();