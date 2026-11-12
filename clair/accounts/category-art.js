/* Category illustrations are presentation only. The native select remains the form field. */
(function(root){
 'use strict';
 const catalog=Object.freeze({
  alimentation:{tile:0,label:'Alimentation',color:'#e8aa57'},
  restaurant:{tile:1,label:'Restaurant',color:'#dd9672'},
  transport:{tile:2,label:'Transport',color:'#8d9cda'},
  logement:{tile:3,label:'Logement',color:'#a99bdb'},
  sante:{tile:4,label:'Santé',color:'#d38ea5'},
  etudes:{tile:5,label:'Études',color:'#b19bd6'},
  vetements:{tile:6,label:'Vêtements',color:'#c28dc1'},
  loisirs:{tile:7,label:'Loisirs',color:'#a28ad8'},
  epargne:{tile:8,label:'Épargne',color:'#c09ad4'},
  income:{tile:9,label:'Argent reçu',color:'#83b49c'},
  telephone:{tile:10,label:'Téléphone',color:'#8e9fd1'},
  hygiene:{tile:11,label:'Hygiène',color:'#82b6b4'},
  famille:{tile:12,label:'Famille',color:'#d4a179'},
  abonnements:{tile:13,label:'Abonnements',color:'#a697cd'},
  imprevus:{tile:14,label:'Imprévus',color:'#cf9b8b'},
  'non-classee':{tile:15,label:'Non classée',color:'#ac97ce'},
  autre:{tile:15,label:'Autre',color:'#ac97ce'}
 });
 const aliases=[
  ['restaurant',/\b(restaurant|resto|repas|cantine|cafe|food delivery)\b/],
  ['sante',/\b(sante|medical|medecin|pharmacie|soins|dentiste)\b/],
  ['income',/\b(salaire|revenu|revenus|bourse|income|argent recu|paie)\b/],
  ['vetements',/\b(vetement|vetements|shopping|habillement|chaussures)\b/],
  ['alimentation',/\b(alimentation|courses|epicerie|nourriture)\b/],
  ['transport',/\b(transport|bus|metro|train|taxi|voiture|essence)\b/],
  ['logement',/\b(logement|loyer|maison|appartement)\b/],
  ['etudes',/\b(etudes|ecole|livres|universite|formation)\b/],
  ['loisirs',/\b(loisirs|cinema|jeux|sorties)\b/],
  ['epargne',/\b(epargne|economies)\b/],
  ['telephone',/\b(telephone|mobile|forfait)\b/],
  ['hygiene',/\b(hygiene|toilette|beaute)\b/],
  ['famille',/\b(famille|enfants|parents)\b/],
  ['abonnements',/\b(abonnement|abonnements|streaming)\b/],
  ['imprevus',/\b(imprevu|imprevus|urgence|reparation)\b/]
 ];
 const vectors=[
  '<path d="M15 28h34l-4 22H19z" fill="#eac09a"/><path d="m22 29 7-15m13 15-7-15"/><path d="M24 39h16m-14-7-2 12m14-12 2 12"/><path d="M20 26c-3-8 8-12 11-4 4-10 15-5 12 4" fill="#a1bf94"/>',
  '<circle cx="33" cy="33" r="20" fill="#eee4d9"/><circle cx="33" cy="33" r="13" fill="#f5c99a"/><path d="M27 30c4-8 14-3 11 5-7 7-15 0-11-5" fill="#a0b68d"/><path d="M9 18v12m5-12v12M9 26h5m-3 4v20m44-32c-6 5-7 14-2 15v17"/>',
  '<rect x="11" y="20" width="42" height="26" rx="7" fill="#a5b1df"/><path d="M17 24h12v11H17zm18 0h12v11H35z" fill="#e6e8f6"/><path d="M17 41h4m22 0h4"/><circle cx="21" cy="47" r="5" fill="#7b699c"/><circle cx="44" cy="47" r="5" fill="#7b699c"/>',
  '<path d="m10 30 22-18 22 18" fill="#b39edb"/><path d="M16 29v24h32V29L32 17z" fill="#e9d7c4"/><path d="M27 53V37h11v16" fill="#b29bd5"/><path d="M20 29h7v7h-7z" fill="#faf3e7"/>',
  '<rect x="11" y="23" width="42" height="29" rx="7" fill="#e8b4be"/><path d="M23 23v-6h18v6"/><path d="M28 29h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#fff5ee" stroke="none"/>',
  '<path d="M12 21c7-5 14-4 20 0 6-4 13-5 20 0v29c-8-4-14-4-20 0-6-4-13-4-20 0z" fill="#c8b4df"/><path d="M32 21v29M18 29l8 1m-8 6 8 1m12-7 8-1m-8 8 8-1"/><path d="M15 50v4h36"/>',
  '<path d="M14 26h28l4 27H10z" fill="#cfa7cf"/><path d="M21 26v-5a7 7 0 0 1 14 0v5"/><path d="m40 16 6 3 6-3 9 9-7 6-3-3v23H36V28l-3 3-7-6 9-9z" fill="#e9d4c4"/>',
  '<path d="M20 25h24c8 0 14 24 6 26-5 2-10-7-12-7H26c-2 0-7 9-12 7-8-2-2-26 6-26" fill="#b5a0d9"/><path d="M21 31v12m-6-6h12"/><circle cx="43" cy="33" r="2" fill="#f7eee6"/><circle cx="48" cy="39" r="2" fill="#f7eee6"/><path d="M32 25v-8h8"/>',
  '<path d="M13 35c0-12 12-20 27-14l9-5v12l5 5v11h-7l-4 9h-7v-6H24v6h-7l-1-9c-5-2-7-6-7-10" fill="#ddb4d6"/><path d="M28 23h10"/><circle cx="43" cy="32" r="2" fill="#735e8f" stroke="none"/><path d="M14 31c-9-10-12 6-4 4"/>',
  '<path d="m15 21 30-7 5 27-30 6z" fill="#b0c7ac"/><rect x="11" y="27" width="42" height="27" rx="6" fill="#bda6d2"/><path d="M38 34h18v13H38z" fill="#dfc8e6"/><circle cx="43" cy="40" r="2" fill="#87719d" stroke="none"/><path d="M23 22h16"/>',
  '<rect x="19" y="9" width="28" height="47" rx="6" fill="#a6b1d8"/><rect x="23" y="15" width="20" height="30" rx="2" fill="#e7e4f2" stroke="none"/><path d="M29 12h8m-6 38h4"/><path d="m28 29 4 4 7-10" stroke="#9b81bf"/>',
  '<path d="M12 32c0-7 28-11 31 0l2 15c-7 7-28 8-35 1z" fill="#b0d3ca"/><path d="M11 33c7 6 24 6 32-1"/><path d="m44 13 8 3-10 31-6-2z" fill="#d5c0e5"/><path d="m46 11 7 3-2 8-8-3z" fill="#f6f0e3"/><circle cx="21" cy="22" r="4" fill="#e4eee9"/><circle cx="30" cy="14" r="3" fill="#e4eee9"/>',
  '<rect x="10" y="12" width="45" height="42" rx="5" fill="#d9b997"/><path d="M15 17h35v31H15z" fill="#eee4e7" stroke="none"/><circle cx="26" cy="29" r="6" fill="#bc9cbd"/><circle cx="40" cy="29" r="5" fill="#b4b1d6"/><path d="M16 47c0-13 20-13 20 0m-2 0c0-12 16-12 16 0" fill="#b6a1cf"/><path d="M23 57h20"/>',
  '<rect x="12" y="16" width="40" height="38" rx="6" fill="#c4b3de"/><path d="M12 28h40M22 11v11m20-11v11"/><circle cx="34" cy="40" r="11" fill="#f3e5ef"/><path d="m31 34 9 6-9 6z" fill="#a68ac6" stroke="none"/>',
  '<rect x="10" y="27" width="45" height="26" rx="6" fill="#d7b0a7"/><path d="M23 27v-8h19v8m-32 10h45M28 34h10v8H28z"/><path d="m23 18 5-8 5 10m8 0 7-8" stroke="#a48cbb"/>',
  '<path d="M10 22h19l5 6h21v24H10z" fill="#bba5d5"/><path d="M10 28h45"/><path d="m30 14 13 1 11 11-13 13-16-16z" fill="#e7d9ed"/><circle cx="34" cy="21" r="2" fill="#a28bbb" stroke="none"/>'
 ];
 const selectQuery='select[name="categoryId"],select[name="habitCategoryId"],select[name^="charge-category-"],select#category-filter,select[data-category-select]';
 const enhanced=new WeakMap();
 const resetForms=new WeakSet();
 let initialized=false,atlasRequested=false,refreshQueued=false,pickerCount=0;
 function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function normalized(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[_-]/g,' ').trim();}
 function resolveCategoryArt(category){
  const object=category&&typeof category==='object'?category:null;
  const id=object?String(object.id??''):String(category??'');
  const suppliedLabel=object?String(object.label??object.name??''):'';
  let key=Object.prototype.hasOwnProperty.call(catalog,id)?id:null;
  if(!key){const text=normalized(suppliedLabel||id);key=aliases.find(([,pattern])=>pattern.test(text))?.[0]||'autre';}
  const art=catalog[key];
  return Object.freeze({key,tile:art.tile,label:suppliedLabel||art.label,color:art.color});
 }
 function categoryArtwork(category,options){
  const opts=options||{},art=resolveCategoryArt(category),size=['sm','md','lg'].includes(opts.size)?opts.size:'md';
  const extra=String(opts.className||'').split(/\s+/).filter(token=>/^[a-zA-Z_][\w-]*$/.test(token)).join(' ');
  const accessible=opts.decorative===false?' role="img" aria-label="'+escapeHTML(opts.label??art.label)+'"':' aria-hidden="true"';
  return '<span class="category-art category-art--'+size+(extra?' '+extra:'')+'" data-category-art="'+art.key+'" data-category-tile="'+art.tile+'"'+accessible+'><span class="category-art-vector"><svg viewBox="0 0 64 64" fill="none" stroke="#756389" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+vectors[art.tile]+'</svg></span><span class="category-art-sprite" aria-hidden="true"></span></span>';
 }
 function optionLabel(option){return String(option?.label??option?.textContent??'').trim();}
 function fieldLabel(select){
  const explicit=select.getAttribute('aria-label');if(explicit)return explicit;
  const label=select.labels?.[0];
  if(label){const text=label.textContent||'';return (label.contains(select)?text.replace(select.textContent||'',''):text).replace(/\s+/g,' ').trim()||'Catégorie';}
  return 'Catégorie';
 }
 function optionCategory(option){return {id:option?.value||'',label:optionLabel(option)};}
 function currentOption(select){return select.options[select.selectedIndex]||null;}
 function refreshPicker(select,state){
  const options=Array.from(select.options),signature=JSON.stringify(options.map(option=>[option.value,optionLabel(option),option.disabled,option.parentElement?.disabled]));
  if(state.signature!==signature){
   state.signature=signature;
   state.panel.innerHTML=options.map((option,index)=>'<button type="button" role="radio" class="category-picker-option" data-category-value="'+escapeHTML(option.value)+'" data-category-index="'+index+'" aria-checked="false" tabindex="-1"'+(option.disabled||option.parentElement?.disabled?' disabled':'')+'>'+categoryArtwork(optionCategory(option),{size:'lg'})+'<span class="category-picker-option-label">'+escapeHTML(optionLabel(option))+'</span><span class="category-picker-check" aria-hidden="true"></span></button>').join('');
   state.selected=null;
  }
  const option=currentOption(select),selection=JSON.stringify([select.selectedIndex,optionLabel(option),select.disabled,select.required]);
  if(state.selected===selection)return;
  state.selected=selection;
  const text=optionLabel(option)||'Choisir une catégorie';
  state.trigger.innerHTML=categoryArtwork(optionCategory(option),{size:'sm'})+'<span class="category-picker-current">'+escapeHTML(text)+'</span><svg class="category-picker-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  state.trigger.setAttribute('aria-label',state.label+' : '+text);
  state.trigger.setAttribute('aria-disabled',String(select.disabled));state.trigger.tabIndex=select.disabled?-1:0;
  if(select.required)state.trigger.setAttribute('aria-required','true');else state.trigger.removeAttribute('aria-required');
  for(const button of state.panel.querySelectorAll('.category-picker-option')){const checked=Number(button.dataset.categoryIndex)===select.selectedIndex;button.setAttribute('aria-checked',String(checked));button.tabIndex=checked&&!button.disabled?0:-1;}
  if(select.disabled)state.details.open=false;
 }
 function chooseOption(select,state,button,close){
  if(select.disabled||button.disabled)return;
  const index=Number(button.dataset.categoryIndex),changed=select.selectedIndex!==index;
  select.selectedIndex=index;
  refreshPicker(select,state);
  if(close){state.details.open=false;state.trigger.setAttribute('aria-expanded','false');state.trigger.focus();}
  if(changed)select.dispatchEvent(new root.Event('change',{bubbles:true}));
 }
 function focusOption(state,last){
  const buttons=Array.from(state.panel.querySelectorAll('.category-picker-option:not(:disabled)'));
  const selected=buttons.find(button=>button.getAttribute('aria-checked')==='true');
  (last?buttons[buttons.length-1]:selected||buttons[0])?.focus();
 }
 function enhanceSelect(select){
  const existing=enhanced.get(select);if(existing){refreshPicker(select,existing);return;}
  if(select.multiple||select.size>1||!select.parentNode||!select.options.length)return;
  if(!root.getComputedStyle||root.getComputedStyle(select.ownerDocument.documentElement).getPropertyValue('--category-art-enhanced').trim()!=='1')return;
  const doc=select.ownerDocument,host=doc.createElement('div'),details=doc.createElement('details'),trigger=doc.createElement('summary'),panel=doc.createElement('div');
  const wrappingLabel=select.closest('label'),wholeLabel=wrappingLabel&&wrappingLabel.querySelectorAll('input,select,textarea,button').length===1;
  const anchor=wholeLabel?wrappingLabel:select,parent=anchor.parentNode;
  const prior={tabindex:select.getAttribute('tabindex'),ariaHidden:select.getAttribute('aria-hidden')};
  let moved=false;
  try{
   const state={host,details,trigger,panel,label:fieldLabel(select),signature:null,selected:null};
   host.className=(wholeLabel?wrappingLabel.className+' ':'')+'category-picker-host';
   details.className='category-picker';details.hidden=true;
   trigger.className='category-picker-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','category-picker-'+(++pickerCount));
   const description=select.getAttribute('aria-describedby');if(description)trigger.setAttribute('aria-describedby',description);
   panel.className='category-picker-panel';panel.id='category-picker-'+pickerCount;panel.setAttribute('role','radiogroup');panel.setAttribute('aria-label',state.label);
   details.append(trigger,panel);host.append(details);parent.insertBefore(host,anchor);
   host.insertBefore(anchor,details);moved=true;
   refreshPicker(select,state);
   trigger.addEventListener('click',event=>{if(select.disabled)event.preventDefault();});
   trigger.addEventListener('keydown',event=>{
    if(select.disabled)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();refreshPicker(select,state);details.open=true;trigger.setAttribute('aria-expanded','true');focusOption(state,event.key==='ArrowUp');}
    else if(event.key==='Escape'&&details.open){event.preventDefault();details.open=false;}
   });
   details.addEventListener('toggle',()=>{
    trigger.setAttribute('aria-expanded',String(details.open));
    if(details.open){refreshPicker(select,state);for(const other of doc.querySelectorAll('.category-picker[open]'))if(other!==details)other.open=false;}
   });
   panel.addEventListener('click',event=>{const button=event.target.closest('.category-picker-option');if(button&&panel.contains(button))chooseOption(select,state,button,true);});
   panel.addEventListener('keydown',event=>{
    const button=event.target.closest('.category-picker-option');if(!button)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();details.open=false;trigger.setAttribute('aria-expanded','false');trigger.focus();return;}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseOption(select,state,button,true);return;}
    const keys=['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'];if(!keys.includes(event.key))return;
    event.preventDefault();
    const buttons=Array.from(panel.querySelectorAll('.category-picker-option:not(:disabled)'));if(!buttons.length)return;
    const columns=Math.max(1,root.getComputedStyle(panel).gridTemplateColumns.split(' ').filter(Boolean).length),position=buttons.indexOf(button);
    const delta=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(position+delta+buttons.length)%buttons.length;
    buttons[next].focus();chooseOption(select,state,buttons[next],false);
   });
   select.addEventListener('change',()=>refreshPicker(select,state));
   select.addEventListener('input',()=>refreshPicker(select,state));
   select.addEventListener('invalid',event=>{event.preventDefault();details.open=true;trigger.focus();});
   if(wholeLabel)wrappingLabel.addEventListener('click',event=>{if(event.target!==select){event.preventDefault();if(!select.disabled){details.open=!details.open;trigger.focus();}}});
   if(select.form&&!resetForms.has(select.form)){select.form.addEventListener('reset',()=>root.setTimeout(()=>enhanceCategorySelects(),0));resetForms.add(select.form);}
   select.classList.add('category-picker-native');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
   host.dataset.categoryEnhanced='true';select.dataset.categoryEnhanced='true';details.hidden=false;enhanced.set(select,state);
  }catch(error){
   if(moved)parent.insertBefore(anchor,host);
   host.remove();select.classList.remove('category-picker-native');delete select.dataset.categoryEnhanced;
   if(prior.tabindex===null)select.removeAttribute('tabindex');else select.setAttribute('tabindex',prior.tabindex);
   if(prior.ariaHidden===null)select.removeAttribute('aria-hidden');else select.setAttribute('aria-hidden',prior.ariaHidden);
  }
 }
 function enhanceCategorySelects(scope){
  const target=scope||root.document;if(!target?.querySelectorAll)return;
  if(target.matches?.(selectQuery))enhanceSelect(target);
  for(const select of target.querySelectorAll(selectQuery))enhanceSelect(select);
 }
 function queueRefresh(){if(refreshQueued)return;refreshQueued=true;Promise.resolve().then(()=>{refreshQueued=false;enhanceCategorySelects();});}
 function initCategoryArt(){
  const doc=root.document;if(!doc)return;
  if(!atlasRequested){
   atlasRequested=true;
   if(typeof root.Image==='function'){
    const atlas=new root.Image(),url='assets/categories/atlas-v1.webp';
    atlas.onload=()=>{
     const absolute=doc.baseURI&&typeof root.URL==='function'?new root.URL(url,doc.baseURI).href:url;
     doc.documentElement.style?.setProperty('--category-art-atlas','url("'+absolute.replace(/["\\\n\r]/g,character=>'\\'+character)+'")');
     doc.documentElement.dataset.categoryArt='ready';
    };
    atlas.onerror=()=>{doc.documentElement.dataset.categoryArt='failed';};atlas.src=url;
   }else doc.documentElement.dataset.categoryArt='failed';
  }
  enhanceCategorySelects(doc);
  if(typeof doc.querySelectorAll!=='function'||typeof doc.createElement!=='function')return;
  if(initialized)return;initialized=true;
  doc.addEventListener('click',event=>{for(const details of doc.querySelectorAll('.category-picker[open]'))if(!details.contains(event.target))details.open=false;queueRefresh();});
  doc.addEventListener('change',queueRefresh);doc.addEventListener('input',queueRefresh);
  doc.addEventListener('load',event=>{if(event.target?.tagName==='LINK')queueRefresh();},true);
  if(typeof root.MutationObserver==='function')new root.MutationObserver(queueRefresh).observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','value','selected','aria-label','aria-labelledby']});
 }
 const api=Object.freeze({resolveCategoryArt,categoryArtwork,enhanceCategorySelects,initCategoryArt});
 root.ClairCategoryArt=api;
 for(const key of Object.keys(api))root[key]=api[key];
})(typeof window!=='undefined'?window:globalThis);
