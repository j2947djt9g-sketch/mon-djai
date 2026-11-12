/* Verre doux: navigation presentation and press feedback; existing actions keep their events. */
(function(root){
 'use strict';
 const selector='.button,.bottom-nav button,.profile-link,.profile-links>button';
 const documents=new WeakSet(),presses=new WeakMap(),navigation=new WeakMap();
 const now=()=>root.performance?.now?.()??Date.now();
 function cancelFrame(state){
  if(state.frame!=null){if(typeof root.cancelAnimationFrame==='function')root.cancelAnimationFrame(state.frame);else root.clearTimeout?.(state.frame);}
  state.frame=null;state.lastTime=null;
 }
 function disposeNavigation(host,state){
  state?.cancelGesture?.(true);
  state?.observer?.disconnect();
  if(state?.resize&&typeof root.removeEventListener==='function')root.removeEventListener('resize',state.resize);
  if(state){
   cancelFrame(state);
   state.media?.removeEventListener?.('change',state.resize);
   for(const [type,handler,options]of state.listeners||[])host.removeEventListener?.(type,handler,options);
   state.drag=null;state.refraction?.replaceChildren();state.indicator?.remove();
  }
  navigation.delete(host);host.classList?.remove('glass-nav-motion','glass-nav-ready');
 }
 function paintIndicator(state,neutral=false){
  const {indicator,droplet,plane,host}=state;
  if(!Number.isFinite(state.width)||!Number.isFinite(state.height))return;
  indicator.style.transform='translate3d('+state.x+'px,'+state.y+'px,0)';
  // The copy is a visual plane, registered to the current lens position every frame.
  // Its origin stays at the lens centre, so text and icons really grow beneath it.
  plane.style.transform='translate3d('+(-state.x)+'px,'+(-state.y)+'px,0) scale(1.13)';
  plane.style.transformOrigin=(state.x+state.width/2)+'px '+(state.y+state.height/2)+'px';
  const speed=neutral?0:Math.min(Math.abs(state.velocity)/1200,1),direction=state.velocity<0?-1:1;
  droplet.style.setProperty('--liquid-energy',speed.toFixed(3));
  const room=Math.max(0,Math.min(state.x-1,host.clientWidth-state.x-state.width-1));
  const stretch=Math.min(1+.3*speed,1+room*2/state.width),squash=1-.11*speed,skew=direction*speed*3.5;
  droplet.style.transform='scale('+stretch+','+squash+') skewX('+skew+'deg)';
  // Circular end caps follow the dock's inset curve; percentages create an oval.
  // Compensate stretch/squash so the moving capsule keeps rounded, full-height ends.
  const radius=state.height/2,horizontalRadius=radius*squash/stretch;
  droplet.style.borderRadius=speed>.01?horizontalRadius.toFixed(2)+'px / '+radius+'px':radius+'px';
 }
 function scheduleMotion(state){
  if(state.frame!=null)return;
  const tick=time=>{
   state.frame=null;
   if(state.indicator.parentElement!==state.host||state.host.isConnected===false){disposeNavigation(state.host,state);return;}
   if(state.media?.matches){state.x=state.target;state.velocity=0;paintIndicator(state,true);return;}
   const dt=Math.min(Math.max((time-(state.lastTime??time-16.67))/1000,.001),.032);state.lastTime=time;
   if(state.drag?.mode==='horizontal'){
    // Direct manipulation stays under the finger; only its optical stretch relaxes.
    state.x=state.target;state.velocity*=Math.exp(-dt*12);
    if(Math.abs(state.velocity)<1){state.velocity=0;state.lastTime=null;paintIndicator(state,true);return;}
    paintIndicator(state);state.frame=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame(tick):root.setTimeout(()=>tick(now()),16);return;
   }
   // A damped spring keeps its velocity when a second tab is tapped mid-flight.
   state.velocity+=(360*(state.target-state.x)-34*state.velocity)*dt;
   state.x+=state.velocity*dt;
   const bounded=Math.max(state.minX,Math.min(state.maxX,state.x));
   if(bounded!==state.x){state.x=bounded;state.velocity=0;}
   const settled=Math.abs(state.target-state.x)<.12&&Math.abs(state.velocity)<1;
   if(settled){state.x=state.target;state.velocity=0;state.lastTime=null;paintIndicator(state,true);return;}
   paintIndicator(state);state.frame=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame(tick):root.setTimeout(()=>tick(now()),16);
  };
  state.frame=typeof root.requestAnimationFrame==='function'?root.requestAnimationFrame(tick):root.setTimeout(()=>tick(now()),16);
 }
 function measureCopies(state){
  state.plane.style.width=state.host.clientWidth+'px';state.plane.style.height=state.host.clientHeight+'px';
  for(let i=0;i<state.buttons.length;i++){
   const button=state.buttons[i],copy=state.copies[i];
   copy.style.left=button.offsetLeft+'px';copy.style.top=button.offsetTop+'px';
   copy.style.width=button.offsetWidth+'px';copy.style.height=button.offsetHeight+'px';
  }
 }
 function refreshCopies(state){
  state.plane.replaceChildren();state.copies=[];
  for(const content of state.content){
   const copy=state.host.ownerDocument.createElement('div');copy.className='glass-nav-lens-item';copy.innerHTML=content;
   // Only the controlled icon/label markup is copied; interactive semantics stay on the real buttons.
   for(const node of copy.querySelectorAll('*')){
    for(const attribute of Array.from(node.attributes))if(attribute.name==='id'||attribute.name.startsWith('data-')||attribute.name.startsWith('aria-')||attribute.name.startsWith('on')||attribute.name==='tabindex'||attribute.name==='autofocus')node.removeAttribute(attribute.name);
    if(node.matches('button,a,input,select,textarea,[contenteditable]'))node.replaceWith(state.host.ownerDocument.createTextNode(node.textContent));
    else if(node.tagName.toLowerCase()==='svg')node.setAttribute('focusable','false');
   }
   state.plane.appendChild(copy);state.copies.push(copy);
  }
  measureCopies(state);
 }
 function positionIndicator(state,snap=false){
  const {host,indicator}=state;
  if(indicator.parentElement!==host||host.isConnected===false){disposeNavigation(host,state);return;}
  const active=state.buttons.find(button=>button.getAttribute('aria-current')==='page'||button.classList.contains('active'));
  if(!active){state.cancelGesture?.(true);cancelFrame(state);state.velocity=0;paintIndicator(state,true);indicator.style.opacity='0';return;}
  const width=active.offsetWidth,height=active.offsetHeight;
  if(!width||!height){state.cancelGesture?.(true);cancelFrame(state);indicator.style.opacity='0';state.positioned=false;return;}
  if(snap)state.cancelGesture?.(true);
  const instant=snap||!state.positioned||state.media?.matches;
  state.width=width;state.height=height;state.y=active.offsetTop;
  state.minX=Math.min(...state.buttons.map(button=>button.offsetLeft));state.maxX=Math.max(...state.buttons.map(button=>button.offsetLeft));
  state.target=active.offsetLeft;
  indicator.style.width=width+'px';indicator.style.height=height+'px';
  measureCopies(state);
  indicator.style.opacity='1';state.positioned=true;
  if(instant){cancelFrame(state);state.x=state.target;state.velocity=0;paintIndicator(state,true);}
  else scheduleMotion(state);
  host.classList.add('glass-nav-ready');
 }
 function bindDrag(state){
  const {host}=state;
  const suppress=drag=>{state.suppression={id:drag.id};};
  const release=drag=>{if(drag.captured)try{host.releasePointerCapture?.(drag.id);}catch{}};
  let globalListeners=[];
  const clearGlobal=()=>{for(const [type,handler]of globalListeners)root.removeEventListener?.(type,handler,true);globalListeners=[];};
  state.cancelGesture=(suppressNative=true)=>{
   const drag=state.drag;state.drag=null;clearGlobal();
   if(!drag)return;
   if(suppressNative)suppress(drag);
   release(drag);
  };
  const finish=(event,cancelled=false)=>{
   const drag=state.drag;if(!drag||event.pointerId!==drag.id)return;
   state.cancelGesture(cancelled||drag.mode!=='pending');
   if(!cancelled&&drag.mode==='horizontal'){
    const centre=state.target+state.width/2;
    const selected=state.buttons.reduce((best,button)=>Math.abs(button.offsetLeft+button.offsetWidth/2-centre)<Math.abs(best.offsetLeft+best.offsetWidth/2-centre)?button:best);
    selected.click();
   }
   positionIndicator(state);
  };
  const down=event=>{
   if(event.defaultPrevented||event.isPrimary===false||event.button!==0||!state.positioned||root.matchMedia?.('(forced-colors: active)').matches)return;
   const button=event.target?.closest?.('button[data-nav]');if(!button||button.parentElement!==host||button.disabled||button.getAttribute('aria-disabled')==='true')return;
   if(state.drag){state.cancelGesture(true);positionIndicator(state,true);}
   state.suppression=null;state.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastTime:now(),mode:'pending',captured:false};
   // Pending/vertical gestures may finish outside the fixed dock. These temporary
   // passive listeners observe only that pointer and never intercept page clicks.
   if(typeof root.addEventListener==='function'){
    globalListeners=[['pointerup',event=>finish(event)],['pointercancel',event=>finish(event,true)],['blur',event=>{if(event.target===root){state.cancelGesture(true);positionIndicator(state,true);}}]];
    for(const [type,handler]of globalListeners)root.addEventListener(type,handler,{capture:true,passive:true});
   }
  };
  const move=event=>{
   const drag=state.drag;if(!drag||event.pointerId!==drag.id||drag.mode==='vertical')return;
   const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
   if(drag.mode==='pending'){
    if(Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)){drag.mode='vertical';positionIndicator(state);return;}
    if(Math.abs(dx)<=6||Math.abs(dx)<Math.abs(dy)*1.15)return;
    drag.mode='horizontal';
    state.indicator.style.opacity='1';
    try{host.setPointerCapture?.(drag.id);drag.captured=true;}catch{}
   }
   event.preventDefault();
   const rect=host.getBoundingClientRect();
   state.target=Math.max(state.minX,Math.min(state.maxX,event.clientX-rect.left-host.clientLeft-state.width/2));
   if(!state.media?.matches){
    const time=now(),elapsed=Math.max(.008,Math.min((time-drag.lastTime)/1000,.08));drag.lastTime=time;
    cancelFrame(state);state.velocity=Math.max(-1800,Math.min(1800,(state.target-state.x)/elapsed));state.x=state.target;
    paintIndicator(state);scheduleMotion(state);
   }
  };
  const click=event=>{
   const suppression=state.suppression;
   // Synthetic button.click() commits through the existing handler. Only the matching
   // native click after a gesture is consumed here, before document delegation.
   if(!suppression||!event.isTrusted||event.detail===0)return;
   if(typeof event.pointerId==='number'&&event.pointerId>=0&&event.pointerId!==suppression.id)return;
   state.suppression=null;event.preventDefault();event.stopImmediatePropagation();
  };
  // Touch starts with implicit capture on its button. Transferring that capture
  // to the dock bubbles a lost event from the button, not a cancelled dock drag.
  state.listeners=[['pointerdown',down,{passive:true}],['pointermove',move,{passive:false}],['pointerup',event=>finish(event),{passive:true}],['pointercancel',event=>finish(event,true),{passive:true}],['lostpointercapture',event=>{if(event.target===host)finish(event,true);},{passive:true}],['click',click,true]];
  for(const [type,handler,options]of state.listeners)host.addEventListener(type,handler,options);
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
   const buttons=Array.from(host.querySelectorAll('button[data-nav]')).filter(button=>button.parentElement===host),indicator=doc.createElement('span'),droplet=doc.createElement('span'),refraction=doc.createElement('span'),plane=doc.createElement('span');
   indicator.className='glass-nav-indicator';indicator.setAttribute('aria-hidden','true');indicator.setAttribute('inert','');
   droplet.className='glass-nav-droplet';refraction.className='glass-nav-refraction';plane.className='glass-nav-refraction-content';
   refraction.appendChild(plane);droplet.appendChild(refraction);indicator.appendChild(droplet);host.insertBefore(indicator,host.firstChild);
   state={host,indicator,droplet,refraction,plane,buttons,key,content:incoming.map(button=>button.innerHTML),positioned:false,frame:null,x:0,y:0,velocity:0,lastTime:null,drag:null,suppression:null};
   state.media=typeof root.matchMedia==='function'?root.matchMedia('(prefers-reduced-motion: reduce)'):null;
   refreshCopies(state);bindDrag(state);
   navigation.set(host,state);host.classList.add('glass-nav-motion');positionIndicator(state,true);
   state.resize=()=>positionIndicator(state,true);
   state.media?.addEventListener?.('change',state.resize);
   if(typeof root.ResizeObserver==='function'){state.observer=new root.ResizeObserver(state.resize);state.observer.observe(host);}
   else if(typeof root.addEventListener==='function')root.addEventListener('resize',state.resize,{passive:true});
  }else{
   let changed=false;
   for(let i=0;i<incoming.length;i++){
    const button=state.buttons[i],next=incoming[i];
    if(state.content[i]!==next.innerHTML){button.innerHTML=next.innerHTML;state.content[i]=next.innerHTML;changed=true;}
    button.classList.toggle('active',next.classList.contains('active'));
    if(next.hasAttribute('aria-current'))button.setAttribute('aria-current',next.getAttribute('aria-current'));else button.removeAttribute('aria-current');
   }
   if(changed)refreshCopies(state);
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
