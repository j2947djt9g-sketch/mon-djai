/* Verre doux: decorative press feedback only; existing actions keep their events. */
(function(root){
 'use strict';
 const selector='.button,.bottom-nav button,.profile-link,.profile-links>button';
 const documents=new WeakSet(),presses=new WeakMap();
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
 root.ClairGlassUI=Object.freeze({init:initClairGlassUI});
})(typeof window!=='undefined'?window:globalThis);
