// Presentation-only press feedback: fictional controls, no account or network access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=path.join(__dirname,'glass-ui.js'),source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const boot={window:null};boot.window=boot;vm.createContext(boot);vm.runInContext(source,boot);
assert.equal(typeof boot.initClairGlassUI,'function','Glass presentation exposes a guarded initializer before it decorates controls');
assert.equal(typeof boot.ClairGlassUI?.init,'function','The namespaced initializer is available to the embedded page');
console.log('PASS glass initializer is available without a document');

function fixture({reduced=false,minimal=false}={}){
 const listeners=new Map(),windowListeners=new Map(),timers=new Map(),storage=new Map([['clair-test','fictional-ledger']]);
 const forbidden={submits:0,storage:0,network:0,navigation:0,focus:0};
 let clock=0,timerId=0;
 class Element{
  constructor(tag='div',classes=''){
   this.nodeType=1;this.tagName=tag.toUpperCase();this.parentElement=null;this.children=[];this.attributes=new Map();this.disabled=false;this.hidden=false;this.tabIndex=tag==='button'?0:-1;
   this.style={setProperty:(key,value)=>{this.style[key]=value;},removeProperty:key=>{delete this.style[key];}};
   const tokens=new Set(classes.split(/\s+/).filter(Boolean));
   this.classList={add:(...names)=>names.forEach(name=>tokens.add(name)),remove:(...names)=>names.forEach(name=>tokens.delete(name)),contains:name=>tokens.has(name),toggle:(name,on)=>{const add=on===undefined?!tokens.has(name):on;add?tokens.add(name):tokens.delete(name);return add;}};
   Object.defineProperty(this,'className',{get:()=>Array.from(tokens).join(' '),set:value=>{tokens.clear();String(value).split(/\s+/).filter(Boolean).forEach(name=>tokens.add(name));}});
  }
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)??null;}
  hasAttribute(key){return this.attributes.has(key);}
  removeAttribute(key){this.attributes.delete(key);}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  appendChild(node){this.append(node);return node;}
  removeChild(node){const index=this.children.indexOf(node);if(index!==-1)this.children.splice(index,1);node.parentElement=null;return node;}
  remove(){this.parentElement?.removeChild(this);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  matches(query){return query.split(',').some(selector=>{
   selector=selector.trim();
   if(selector===':disabled')return this.disabled;
   if(selector==='button')return this.tagName==='BUTTON';
   if(selector==='[aria-disabled="true"]')return this.getAttribute('aria-disabled')==='true';
   if(selector.startsWith('.')){
    const ancestor=selector.match(/^(\.[\w-]+)\s*(>| )\s*button$/);
    if(ancestor)return this.tagName==='BUTTON'&&(ancestor[2]==='>'?this.parentElement?.matches(ancestor[1]):!!this.parentElement?.closest(ancestor[1]));
    return selector.slice(1).split('.').every(name=>this.classList.contains(name));
   }
   return false;
  });}
  closest(query){return this.matches(query)?this:this.parentElement?.closest(query)||null;}
  querySelectorAll(query){return this.children.flatMap(child=>[...(child.matches(query)?[child]:[]),...child.querySelectorAll(query)]);}
  querySelector(query){return this.querySelectorAll(query)[0]||null;}
  getBoundingClientRect(){return {left:12,top:20,width:120,height:48,right:132,bottom:68};}
  get isConnected(){return document.documentElement.contains(this);}
  focus(){forbidden.focus++;document.activeElement=this;}
  click(){forbidden.submits++;}
  submit(){forbidden.submits++;}
  requestSubmit(){forbidden.submits++;}
 }
 const add=(map,type,callback,options)=>{const rows=map.get(type)||[];rows.push({callback,options});map.set(type,rows);};
 const document={readyState:'complete',createElement:tag=>new Element(tag),addEventListener:(...args)=>add(listeners,...args),querySelectorAll:query=>document.documentElement.querySelectorAll(query)};
 document.documentElement=new Element('html');document.body=new Element('body');document.documentElement.append(document.body);document.activeElement=document.body;
 const data={schemaVersion:3,transactions:[{id:'fictional-lunch',type:'expense',amountCents:1250,categoryId:'alimentation'}],preferences:{profileName:'Alex'}};
 const sandbox={document:minimal?{addEventListener:(...args)=>add(listeners,...args)}:document,console,Map,Set,WeakMap,WeakSet,Element,HTMLElement:Element,data,
  matchMedia:()=>({matches:reduced,addEventListener(){},removeEventListener(){}}),
  addEventListener:(...args)=>add(windowListeners,...args),
  setTimeout:(callback,delay=0)=>{const id=++timerId;timers.set(id,{callback,time:clock+Number(delay)});return id;},clearTimeout:id=>timers.delete(id),
  getComputedStyle:()=>({position:'relative'}),
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{forbidden.storage++;storage.set(key,value);},removeItem:key=>{forbidden.storage++;storage.delete(key);},clear:()=>{forbidden.storage++;storage.clear();}},
  fetch:()=>{forbidden.network++;throw Error('No network belongs in glass presentation');},
  location:{assign(){forbidden.navigation++;},replace(){forbidden.navigation++;}},
  switchPage(){forbidden.navigation++;},commit(){forbidden.submits++;},cloud:{user:null}
 };
 sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);sandbox.initClairGlassUI();
 function dispatch(type,target,extra={}){
  const event={type,target,button:0,isPrimary:true,pointerType:'touch',pointerId:1,clientX:30,clientY:35,defaultPrevented:false,propagationStopped:false,
   preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;},...extra};
  for(const row of listeners.get(type)||[])row.callback(event);
  return event;
 }
 function advance(milliseconds){clock+=milliseconds;for(let count=0;count<100;count++){const next=Array.from(timers).find(([,timer])=>timer.time<=clock);if(!next)return;timers.delete(next[0]);next[1].callback();}assert.fail('Press feedback must not create an unbounded timer loop');}
 return {sandbox,document,Element,listeners,windowListeners,forbidden,storage,data,timers,dispatch,advance};
}

// Break caught: repeat render/init registering a second handler, or incomplete test documents crashing app startup.
{
 const f=fixture();f.sandbox.initClairGlassUI();f.sandbox.ClairGlassUI.init();f.sandbox.initClairGlassUI();
 assert.equal(f.listeners.get('pointerdown')?.length,1,'Repeated initialization must not multiply delegated press feedback');
 assert.equal(f.listeners.get('pointerdown')[0].options?.passive,true,'Press decoration cannot cancel native interaction');
 assert.equal(f.listeners.size,1,'Glass feedback only observes pointerdown; native form, keyboard and click handlers retain control');
 const minimal=fixture({minimal:true});assert.doesNotThrow(()=>minimal.sandbox.initClairGlassUI());assert.equal(minimal.listeners.size,0,'Incomplete documents are safely ignored');
}
console.log('PASS idempotent passive delegation and safe startup with incomplete documents');

// Break caught: broad event delegation submitting a financial form, changing storage or replacing native selection/navigation.
{
 const f=fixture(),before=JSON.stringify(f.data),stored=JSON.stringify(Array.from(f.storage));
 const form=new f.Element('form'),submit=new f.Element('button','button'),icon=new f.Element('svg'),nativeSelect=new f.Element('select'),picker=new f.Element('button','category-picker-option'),nav=new f.Element('nav','bottom-nav'),navButton=new f.Element('button'),profileLink=new f.Element('a','profile-link'),profileLinks=new f.Element('div','profile-links'),profileButton=new f.Element('button');
 submit.type='submit';nativeSelect.value='alimentation';picker.type='button';navButton.dataset={page:'journal'};form.append(submit,nativeSelect,picker);submit.append(icon);nav.append(navButton);profileLinks.append(profileButton);f.document.body.append(form,nav,profileLink,profileLinks);
 f.document.activeElement=nativeSelect;
 const press=f.dispatch('pointerdown',icon);assert.equal(submit.classList.contains('glass-pressed'),true,'Nested icons decorate their enclosing control');
 assert.equal(submit.querySelectorAll('.glass-ripple').length,1,'A press creates one decorative ripple');assert.equal(submit.querySelector('.glass-ripple').getAttribute('aria-hidden'),'true');
 for(const target of [nativeSelect,picker,navButton,profileLink,profileButton])for(const type of ['pointerdown','keydown','keyup','click','change','submit']){
  const event=f.dispatch(type,target,{key:'Enter'});assert.equal(event.defaultPrevented,false);assert.equal(event.propagationStopped,false);
 }
 for(const target of [navButton,profileLink,profileButton])assert.equal(target.classList.contains('glass-pressed'),true,'Existing navigation and profile controls receive delegated feedback');
 for(const key of ['Enter',' '])for(const type of ['keydown','keyup']){const event=f.dispatch(type,submit,{key});assert.equal(event.defaultPrevented,false);assert.equal(event.propagationStopped,false);}
 assert.equal(press.defaultPrevented,false);assert.equal(press.propagationStopped,false);
 assert.equal(nativeSelect.value,'alimentation');assert.equal(picker.classList.contains('glass-pressed'),false,'Category radios retain their own interaction');
 assert.equal(f.document.activeElement,nativeSelect);assert.equal(submit.tabIndex,0);assert.equal(navButton.tabIndex,0);
 assert.equal(JSON.stringify(f.data),before,'Presentation cannot change the financial ledger');assert.equal(JSON.stringify(Array.from(f.storage)),stored);
 assert.deepEqual(f.forbidden,{submits:0,storage:0,network:0,navigation:0,focus:0},'Press feedback must never bypass existing submit or auth/navigation handlers');
}
console.log('PASS financial form, category picker, keyboard focus and auth/navigation boundaries remain native');

// Break caught: canceled or rapid presses leaving a permanent class/ripple, including an absent pointerup.
{
 const f=fixture(),button=new f.Element('button','button');f.document.body.append(button);
 f.dispatch('pointerdown',button);f.advance(80);f.dispatch('pointerdown',button);f.dispatch('pointercancel',button);f.dispatch('blur',button);
 assert.equal(button.classList.contains('glass-pressed'),true,'A new press restarts transient feedback');
 f.advance(600);assert.equal(button.classList.contains('glass-pressed'),false,'Feedback clears without a release event');assert.equal(button.querySelectorAll('.glass-ripple').length,0,'Canceled and repeated presses leave no orphan decoration');assert.equal(f.timers.size,0);
 const detached=new f.Element('button','button');f.document.body.append(detached);f.dispatch('pointerdown',detached);detached.remove();assert.doesNotThrow(()=>f.advance(600));assert.equal(detached.classList.contains('glass-pressed'),false);
}
console.log('PASS repeated, canceled and detached presses clean up without pointerup');

// Break caught: decorative animations running for reduced motion, disabled controls, secondary buttons or multiple pointers.
for(const mode of ['reduced','disabled','aria-disabled','secondary','nonprimary']){
 const f=fixture({reduced:mode==='reduced'}),button=new f.Element('button','button');f.document.body.append(button);
 if(mode==='disabled')button.disabled=true;if(mode==='aria-disabled')button.setAttribute('aria-disabled','true');
 f.dispatch('pointerdown',button,{button:mode==='secondary'?2:0,isPrimary:mode!=='nonprimary'});
 assert.equal(button.classList.contains('glass-pressed'),false,mode+' cannot start press feedback');assert.equal(button.querySelectorAll('.glass-ripple').length,0,mode+' cannot create a ripple');assert.equal(f.timers.size,0);
}
console.log('PASS reduced motion, disabled controls and secondary/nonprimary input produce no animation');
