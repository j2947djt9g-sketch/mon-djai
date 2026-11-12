/* Verre doux: navigation presentation and press feedback; existing actions keep their events. */
(function(root){
 'use strict';
 const selector='.button,.bottom-nav button,.profile-link,.profile-links>button';
 const documents=new WeakSet(),presses=new WeakMap(),navigation=new WeakMap();
 function disposeNavigation(host,state){
  state?.observer?.disconnect();
  if(state?.resize&&typeof root.removeEventListener==='function')root.removeEventListener('resize',state.resize);
  if(state?.frame!=null){if(typeof root.cancelAnimationFrame==='function')root.cancelAnimationFrame(state.frame);else root.clearTimeout?.(state.frame);}
  navigation.delete(host);host.classList?.remove('glass-nav-motion','glass-nav-ready');
 }
 function positionIndicator(state,snap=false){
  const {host,indicator}=state;
  if(indicator.parentElement!==host||host.isConnected===false){disposeNavigation(host,state);return;}
  const active=state.buttons.find(button=>button.getAttribute('aria-current')==='page'||button.classList.contains('active'));
  if(!active){indicator.style.opacity='0';return;}
  const width=active.offsetWidth,height=active.offsetHeight;
  if(!width||!height){indicator.style.opacity='0';state.positioned=false;return;}
  const instant=snap||!state.positioned;
  if(instant)indicator.style.transition='none';
  indicator.style.width=width+'px';indicator.style.height=height+'px';
  indicator.style.transform='translate3d('+active.offsetLeft+'px,'+active.offsetTop+'px,0)';
  indicator.style.opacity='1';state.positioned=true;
  if(instant){
   // Commit the initial/resized position before enabling transitions; no slide from zero.
   indicator.getBoundingClientRect();
   if(state.frame!=null){if(typeof root.cancelAnimationFrame==='function')root.cancelAnimationFrame(state.frame);else root.clearTimeout?.(state.frame);}
   const ready=()=>{state.frame=null;if(indicator.parentElement===host){indicator.style.transition='';host.classList.add('glass-nav-ready');}};
   state.frame=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame(ready):root.setTimeout(ready,0);
  }
 }
 function renderNavigation(host,markup){
  if(!host)return;
  let state=navigation.get(host);
  if(!markup){disposeNavigation(host,state);host.innerHTML='';return;}
  const doc=host.ownerDocument;
  if(!doc?.createElement||typeof host.querySelectorAll!=='function'||!host.classList){host.innerHTML=markup;return;}
  const buffer=doc.createElement('div');buffer.innerHTML=markup;
  const incoming=Array.from(buffer.children).filter(button=>button.matches('button[data-nav]'));
  const key=incoming.map(button=>button.dataset.nav).join('|');
  if(!incoming.length){disposeNavigation(host,state);host.innerHTML=markup;return;}
  if(!state||state.key!==key||state.indicator.parentElement!==host||state.buttons.some(button=>button.parentElement!==host)){
   disposeNavigation(host,state);host.innerHTML=markup;
   const buttons=Array.from(host.querySelectorAll('button[data-nav]')).filter(button=>button.parentElement===host),indicator=doc.createElement('span');
   indicator.className='glass-nav-indicator';indicator.setAttribute('aria-hidden','true');host.insertBefore(indicator,host.firstChild);
   state={host,indicator,buttons,key,content:incoming.map(button=>button.innerHTML),positioned:false,frame:null};
   navigation.set(host,state);host.classList.add('glass-nav-motion');positionIndicator(state,true);
   state.resize=()=>positionIndicator(state,true);
   if(typeof root.ResizeObserver==='function'){state.observer=new root.ResizeObserver(state.resize);state.observer.observe(host);}
   else if(typeof root.addEventListener==='function')root.addEventListener('resize',state.resize,{passive:true});
  }else{
   for(let i=0;i<incoming.length;i++){
    const button=state.buttons[i],next=incoming[i];
    if(state.content[i]!==next.innerHTML){button.innerHTML=next.innerHTML;state.content[i]=next.innerHTML;}
    button.classList.toggle('active',next.classList.contains('active'));
    if(next.hasAttribute('aria-current'))button.setAttribute('aria-current',next.getAttribute('aria-current'));else button.removeAttribute('aria-current');
   }
   positionIndicator(state);
  }
 }
 function initClairGlassUI(){
  const doc=root.document;
  if(!doc||typeof doc.querySelectorAll!=='function'||typeof doc.createElement!=='function'||typeof doc.addEventListener!=='function'||!doc.documentElement?.classList||typeof root.setTimeout!=='function'||typeof root.clearTimeout!=='function')return false;
  if(documents.has(doc))return true;
  doc.addEventListener('pointerdown',event=>{
   if(event.defaultPrevented||event.isPrimary===false||(typeof event.button==='number'&&event.button!==0))return;
   if(typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const target=event.target?.closest?event.target:event.target?.parentElement,control=target?.closest?.(selector);
   if(!control||control.disabled||control.matches?.(':disabled')||control.getAttribute?.('aria-disabled')==='true'||!control.classList||typeof control.getBoundingClientRect!=='function'||typeof control.appendChild!=='function')return;
   const previous=presses.get(control);
   if(previous){root.clearTimeout(previous.release);root.clearTimeout(previous.cleanup);previous.ripple.remove();}
   const box=control.getBoundingClientRect(),size=Math.max(box.width,box.height)*2;
   if(!Number.isFinite(size)||size<=0)return;
   const ripple=doc.createElement('span'),state={ripple,release:null,cleanup:null};
   ripple.className='glass-ripple';ripple.setAttribute('aria-hidden','true');
   const x=Number.isFinite(event.clientX)?event.clientX-box.left:box.width/2,y=Number.isFinite(event.clientY)?event.clientY-box.top:box.height/2;
   ripple.style.width=size+'px';ripple.style.height=size+'px';ripple.style.left=(x-size/2)+'px';ripple.style.top=(y-size/2)+'px';
   control.classList.add('glass-pressed');control.appendChild(ripple);
   state.release=root.setTimeout(()=>control.classList.remove('glass-pressed'),150);
   state.cleanup=root.setTimeout(()=>{ripple.remove();if(presses.get(control)===state)presses.delete(control);},520);
   presses.set(control,state);
  },{passive:true});
  documents.add(doc);return true;
 }
 root.initClairGlassUI=initClairGlassUI;
 root.ClairGlassUI=Object.freeze({init:initClairGlassUI,renderNavigation});
})(typeof window!=='undefined'?window:globalThis);
