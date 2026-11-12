// Actual application, fictional Alex ledger, trusted mouse/touch. All external requests and SW blocked.
// Catches a rigid sliding pill, misaligned/fake refraction, accidental drag navigation and leaked animation.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),storageKey='clair-github-money-v3',baseline=process.argv.includes('--baseline');
const baselineHtml=baseline?execFileSync('git',['show','77f3b4e:clair/index.html'],{cwd:path.resolve(root,'..'),encoding:'utf8'}):null;
const output=process.env.CLAIR_LIQUID_OUTPUT,settle=760;
const seed=theme=>({version:3,currency:'EUR',initialized:true,setupDone:true,openingCents:100000,openingBalanceDate:'2026-10-01',transactions:[{id:'fictional-saving',type:'expense',categoryId:'epargne',savingsProjectId:'reserve',amountCents:3000,date:'2026-10-02',name:'Réserve fictive'},{id:'fictional-shop',type:'expense',categoryId:'alimentation',amountCents:1200,date:'2026-10-03',name:'Courses fictives'}],rules:[],skipped:[],budgets:{alimentation:100},budgetOverrides:{},customCategories:[],savingsGoal:0,savingsSchema:1,savingsProjects:[{id:'reserve',name:'Réserve',kind:'autre',icon:'star',color:'violet',targetCents:50000,targetDate:null,archived:false}],fixedExpenses:[],preferences:{theme,wallpaper:'plain',photo:null,reminders:false,guideVersion:1,profileName:'Alex'}});
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(baselineHtml&&pathname==='/index.html'){res.setHeader('content-type','text/html;charset=utf-8');res.end(baselineHtml);return;}const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',{'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
async function open(browser,origin,{width=390,theme='light',motion='no-preference',record=false}={}){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,colorScheme:theme,reducedMotion:motion,serviceWorkers:'block',...(record&&output?{recordVideo:{dir:output,size:{width,height:844}}}:{})}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.addInitScript(({data,key})=>{
  window.CLAIR_ACCOUNT_CONFIG=null;localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');localStorage.setItem(key,JSON.stringify(data));
  // Observe native scheduling without changing frame timing or callbacks.
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
  window.__liquidRaf={pending,requested:0,called:0};
  window.requestAnimationFrame=callback=>{window.__liquidRaf.requested++;const id=request(time=>{pending.delete(id);window.__liquidRaf.called++;callback(time);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 },{data:seed(theme),key:storageKey});
 await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();await page.waitForFunction(()=>document.querySelector('.bottom-nav')?.classList.contains('glass-nav-ready'));
 await page.evaluate(()=>{window.__liquidOriginalButtons=[...document.querySelectorAll('.bottom-nav > button[data-nav]')];window.__liquidOriginalIndicator=document.querySelector('.bottom-nav .glass-nav-indicator');window.__liquidClicks=[];document.addEventListener('click',event=>{const button=event.target.closest?.('.bottom-nav > button[data-nav]');if(button)window.__liquidClicks.push(button.dataset.nav);});});
 return {context,page,errors,read:()=>page.evaluate(key=>localStorage.getItem(key),storageKey)};
}
const close=(actual,expected,message,tolerance=1.6)=>assert(Math.abs(actual-expected)<=tolerance,message+': '+actual+' vs '+expected);
async function snapshot(page){return page.evaluate(()=>{
 const nav=document.querySelector('.bottom-nav'),outer=nav.querySelector('.glass-nav-indicator'),drop=outer?.querySelector('.glass-nav-droplet'),box=outer?.getBoundingClientRect(),host=nav.getBoundingClientRect(),style=drop?getComputedStyle(drop):null,matrix=style?new DOMMatrixReadOnly(style.transform):null;
 return {x:box?.left-host.left,y:box?.top-host.top,width:box?.width,height:box?.height,dropWidth:drop?.getBoundingClientRect().width,dropHeight:drop?.getBoundingClientRect().height,radius:style?.borderRadius,sx:matrix?.m11,sy:matrix?.m22,skew:matrix?.m21,opacity:outer?Number(getComputedStyle(outer).opacity):null,current:nav.querySelector('[aria-current="page"]')?.dataset.nav||null,clicks:window.__liquidClicks.slice()};
});}
async function frameTrace(page,nav,retarget=null){return page.evaluate(async({nav,retarget,duration})=>{
 const host=document.querySelector('.bottom-nav'),outer=host.querySelector('.glass-nav-indicator');
 const sample=()=>{const drop=outer.querySelector('.glass-nav-droplet'),box=outer.getBoundingClientRect(),h=host.getBoundingClientRect(),style=drop?getComputedStyle(drop):null,m=style?new DOMMatrixReadOnly(style.transform):null;return {time:performance.now(),x:box.left-h.left,y:box.top-h.top,width:box.width,height:box.height,dropWidth:drop?.getBoundingClientRect().width,dropHeight:drop?.getBoundingClientRect().height,radius:style?.borderRadius,sx:m?.m11,sy:m?.m22,skew:m?.m21};};
 const result={before:sample(),frames:[]};host.querySelector('[data-nav="'+nav+'"]').click();result.immediate=sample();const start=performance.now();let changed=false;
 while(performance.now()-start<duration){await new Promise(requestAnimationFrame);if(retarget&&!changed&&performance.now()-start>=85){result.retargetBefore=sample();host.querySelector('[data-nav="'+retarget+'"]').click();result.retargetAfter=sample();changed=true;}result.frames.push(sample());}
 result.final=sample();const active=host.querySelector('[aria-current="page"]'),box=active.getBoundingClientRect(),h=host.getBoundingClientRect();result.target={x:box.left-h.left,y:box.top-h.top,width:box.width,height:box.height};return result;
 },{nav,retarget,duration:settle});}
function neutral(frame,label){close(frame.sx,1,label+' restores neutral horizontal scale',.005);close(frame.sy,1,label+' restores neutral vertical scale',.005);close(frame.skew,0,label+' restores neutral skew',.005);}
function aligned(trace,label){for(const field of ['x','y','width','height'])close(trace.final[field],trace.target[field],label+' marker '+field);neutral(trace.final,label);}
function elastic(trace,label){
 aligned(trace,label);close(trace.immediate.x,trace.before.x,label+' starts at the painted position');
 assert(trace.frames.filter(frame=>Math.abs(frame.x-trace.before.x)>3&&Math.abs(frame.x-trace.final.x)>3).length>=3,label+' paints continuous travel');
 assert(trace.frames.some(frame=>Math.abs(frame.dropWidth-trace.before.dropWidth)>4),label+' visibly stretches its droplet width');
 assert(trace.frames.some(frame=>Math.abs(frame.dropHeight-trace.before.dropHeight)>1.5),label+' deforms its droplet height');
 assert(new Set(trace.frames.map(frame=>frame.radius)).size>2,label+' changes the curved droplet rim while moving');
 assert(trace.frames.some(frame=>Math.abs(frame.skew)>.005),label+' bends the lens during motion');
}
async function semantics(page){
 const nav=page.locator('.bottom-nav'),decoration=nav.locator('.glass-nav-indicator');assert.equal(await decoration.count(),1,'A single retained droplet carries selection');assert.equal(await nav.locator('button').count(),3,'Refraction must not duplicate navigation buttons');
 for(const [id,label]of [['home','Accueil'],['journal','Historique'],['settings','Réglages']])assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('data-nav'),id);
 const details=await decoration.evaluate(node=>({hidden:node.getAttribute('aria-hidden'),inert:node.inert,pointers:getComputedStyle(node).pointerEvents,interactive:node.querySelectorAll('button,a,input,select,textarea,[tabindex],[data-nav],[aria-current],[id]').length,copyCount:node.querySelectorAll('.glass-nav-lens-item').length,copyText:[...node.querySelectorAll('.glass-nav-lens-item')].map(item=>item.textContent.trim())}));
 assert.equal(details.hidden,'true');assert(details.inert,'The full optical decoration is inert');assert.equal(details.pointers,'none');assert.equal(details.interactive,0,'No cloned navigation semantics, focus targets or IDs enter the lens');assert.equal(details.copyCount,3,'The lens refracts real copies of all three icon/label pairs');assert.deepEqual(details.copyText,['Accueil','Historique','Réglages']);
 assert(await page.evaluate(()=>window.__liquidOriginalIndicator===document.querySelector('.glass-nav-indicator')&&window.__liquidOriginalButtons.every((button,i)=>button===document.querySelectorAll('.bottom-nav > button[data-nav]')[i])),'Optics preserve the original controls and focus identity');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The droplet never creates horizontal overflow');
}
async function refraction(page,label){
 const optics=await page.evaluate(()=>{
  const host=document.querySelector('.bottom-nav'),outer=host.querySelector('.glass-nav-indicator'),box=outer.getBoundingClientRect(),center={x:box.left+box.width/2,y:box.top+box.height/2},copies=[...outer.querySelectorAll('.glass-nav-lens-item')],buttons=[...host.querySelectorAll(':scope > button[data-nav]')];
  return {center,items:buttons.map((button,i)=>{const original=button.querySelector('svg').getBoundingClientRect(),copy=copies[i]?.querySelector('svg')?.getBoundingClientRect();return {original:{x:original.left+original.width/2,y:original.top+original.height/2,width:original.width,height:original.height},copy:copy?{x:copy.left+copy.width/2,y:copy.top+copy.height/2,width:copy.width,height:copy.height}:null};}),rim:getComputedStyle(outer.querySelector('.glass-nav-droplet'),'::after').backgroundImage};
 });
 for(const item of optics.items){assert(item.copy,label+' includes copied icon paths');const scale=item.copy.width/item.original.width;assert(scale>1.08&&scale<1.28,label+' visibly magnifies content');close(item.copy.x,optics.center.x+(item.original.x-optics.center.x)*scale,label+' refracted icon stays registered horizontally',2);close(item.copy.y,optics.center.y+(item.original.y-optics.center.y)*scale,label+' refracted icon stays registered vertically',2);}
 assert.notEqual(optics.rim,'none',label+' has an optical rim');
}
async function idle(page,label){
 await page.waitForTimeout(settle);const before=await page.evaluate(()=>({requested:window.__liquidRaf.requested,called:window.__liquidRaf.called,pending:window.__liquidRaf.pending.size}));await page.waitForTimeout(160);const after=await page.evaluate(()=>({requested:window.__liquidRaf.requested,called:window.__liquidRaf.called,pending:window.__liquidRaf.pending.size}));assert.equal(after.requested,before.requested,label+' stops requesting animation frames');assert.equal(after.called,before.called,label+' stops running animation frames');assert.equal(after.pending,0,label+' leaves no queued frame');
}
async function opticalCases(browser,origin){
 for(const width of [320,390])for(const theme of ['light','dark']){
  const f=await open(browser,origin,{width,theme,record:!!output&&width===390&&theme==='light'});try{
   const before=await f.read(),label=width+'px '+theme;await semantics(f.page);await refraction(f.page,label);
   const forward=await frameTrace(f.page,'journal');elastic(forward,label+' forward');await refraction(f.page,label+' journal');
   const backward=await frameTrace(f.page,'home');elastic(backward,label+' reverse');
   const rapid=await frameTrace(f.page,'settings','journal');aligned(rapid,label+' rapid retarget');close(rapid.retargetAfter.x,rapid.retargetBefore.x,label+' retarget stays continuous');
   assert(rapid.frames.some(frame=>frame.time>rapid.retargetAfter.time&&Math.abs(frame.x-rapid.final.x)>3),label+' retarget settles through intermediate frames');
   await semantics(f.page);await idle(f.page,label+' settled');assert.equal(await f.read(),before,label+' optical movement never changes financial JSON');assert.deepEqual(f.errors,[]);
   if(output){await f.page.screenshot({path:path.join(output,'liquid-settled-'+width+'-'+theme+'.png')});fs.writeFileSync(path.join(output,'liquid-frames-'+width+'-'+theme+'.json'),JSON.stringify({forward,backward,rapid},null,2));}
   console.log('PASS '+label+': deforming curved lens, registered magnification, rapid retarget, accessible original controls, bounded idle');
  }finally{await f.context.close();}
 }
}
async function boxes(page){return page.locator('.bottom-nav > button[data-nav]').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.dataset.nav,x:r.left+r.width/2,y:r.top+r.height/2,width:r.width};}));}
async function begin(page,kind,start){
 if(kind==='mouse'){await page.mouse.move(start.x,start.y);await page.mouse.down();return {move:point=>page.mouse.move(point.x,point.y),end:()=>page.mouse.up(),cancel:()=>page.locator('.bottom-nav').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true})};}
 const cdp=await page.context().newCDPSession(page),send=(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{x:point.x,y:point.y,id:7,radiusX:2,radiusY:2}]:[]});await send('touchStart',start);return {move:point=>send('touchMove',point),end:async()=>{await send('touchEnd');await cdp.detach();},cancel:async()=>{await send('touchCancel');await cdp.detach();}};
}
async function drag(page,kind,{cancel=false,vertical=false,end=true}={}){
 const [home,,settings]=await boxes(page),initial=await snapshot(page),pointer=await begin(page,kind,home),frames=[];
 for(let step=1;step<=12;step++){const fraction=step/12;await pointer.move({x:home.x+(vertical?3:(settings.x-home.x)*fraction),y:home.y-(vertical?66*fraction:0)});await page.waitForTimeout(18);const frame=await snapshot(page);frames.push(frame);assert.equal(frame.current,'home',kind+' gesture cannot navigate before release');assert.deepEqual(frame.clicks,initial.clicks,kind+' gesture cannot click before release');}
 if(!vertical){assert(new Set(frames.map(frame=>frame.x.toFixed(1))).size>=8,kind+' drag follows continuous positions across slots');assert(frames.filter(frame=>frame.x>initial.x+10&&frame.x<frames.at(-1).x-10).length>=5,kind+' drag paints values between destinations: '+JSON.stringify(frames.map(f=>({x:f.x,current:f.current}))));close(frames[5].x-initial.x,(settings.x-home.x)/2,kind+' lens follows the actual pointer',20);}
 if(!end)return {pointer,initial,frames};if(cancel)await pointer.cancel();else await pointer.end();await page.waitForTimeout(settle);const final=await snapshot(page);
 assert.equal(final.current,vertical||cancel?'home':'settings',kind+' release selects only a completed horizontal drag');assert.deepEqual(final.clicks,vertical||cancel?initial.clicks:[...initial.clicks,'settings'],kind+' release invokes the existing navigation exactly once');neutral(final,kind+' gesture end');return {initial,frames,final};
}
async function interactions(browser,origin,kinds=['mouse','touch']){
 for(const kind of kinds){
  const f=await open(browser,origin);try{
   const before=await f.read(),result=await drag(f.page,kind);await semantics(f.page);
   if(kind==='touch'){const journal=(await boxes(f.page))[1],tap=await begin(f.page,'touch',journal),oldClicks=(await snapshot(f.page)).clicks;await tap.end();await f.page.waitForTimeout(settle);const tapped=await snapshot(f.page);assert.equal(tapped.current,'journal','An ordinary trusted touch tap still navigates');assert.deepEqual(tapped.clicks,[...oldClicks,'journal'],'A trusted touch tap invokes navigation once');}
   await f.page.locator('.bottom-nav [data-nav="journal"]').click();await f.page.waitForTimeout(settle);assert.equal((await snapshot(f.page)).current,'journal','A fresh click immediately after '+kind+' drag is never swallowed');
   const home=f.page.locator('.bottom-nav > [data-nav="home"]');await home.focus();await f.page.keyboard.press('Enter');await f.page.waitForTimeout(settle);assert(await home.evaluate(node=>document.activeElement===node),'Enter keeps the original focused control');
   const settings=f.page.locator('.bottom-nav > [data-nav="settings"]');await settings.focus();await f.page.keyboard.press('Space');await f.page.waitForTimeout(settle);assert.equal((await snapshot(f.page)).current,'settings','Space activation still routes normally');await home.click();await f.page.waitForTimeout(settle);
   await drag(f.page,kind,{vertical:true});await drag(f.page,kind,{cancel:true});if(kind==='mouse')await f.page.mouse.up();
   await idle(f.page,kind+' gesture cleanup');assert.equal(await f.read(),before,kind+' gestures never change financial JSON');assert.deepEqual(f.errors,[]);
   if(output)fs.writeFileSync(path.join(output,'liquid-drag-'+kind+'.json'),JSON.stringify(result,null,2));console.log('PASS '+kind+': trusted continuous drag, one release navigation, vertical/cancel restore, fresh click, Enter/Space, unchanged financial JSON');
  }finally{await f.context.close();}
 }
}
async function lifecycle(browser,origin){
 const f=await open(browser,origin);try{
  const before=await f.read();let active=await drag(f.page,'touch',{end:false});await f.page.locator('.profile-button').evaluate(node=>node.click());await active.pointer.end();await f.page.waitForTimeout(settle);assert.equal((await snapshot(f.page)).current,null,'Opening the profile during drag cancels its pending destination');assert((await snapshot(f.page)).opacity<=.01,'The profile hides the lens');await idle(f.page,'Profile');
  await f.page.locator('.bottom-nav > [data-nav="home"]').click();await f.page.waitForTimeout(settle);active=await drag(f.page,'touch',{end:false});await f.page.setViewportSize({width:1440,height:844});await active.pointer.end();await f.page.waitForTimeout(settle);assert(await f.page.locator('.bottom-nav').isHidden(),'Desktop resize hides the mobile lens');assert.equal((await snapshot(f.page)).current,'home','A hidden drag cannot commit after desktop resize');await idle(f.page,'Hidden desktop');
  await f.page.setViewportSize({width:320,height:844});await f.page.waitForTimeout(settle);const resize=await frameTrace(f.page,'journal');aligned(resize,'320px resize');await refraction(f.page,'320px resize');
  await f.page.locator('.bottom-nav > [data-nav="home"]').click();await f.page.waitForTimeout(settle);active=await drag(f.page,'touch',{end:false});await f.page.evaluate(()=>{window.__liquidClearedHost=document.querySelector('.bottom-nav');window.ClairGlassUI.renderNavigation(window.__liquidClearedHost,'');});await active.pointer.end();await f.page.waitForTimeout(settle);assert.equal(await f.page.locator('.bottom-nav').innerHTML(),'','Auth clearing removes the lens and all cloned content');assert.deepEqual(await f.page.evaluate(()=>window.__liquidClicks),active.initial.clicks,'A cleared gesture cannot navigate');await idle(f.page,'Auth clearing');
  await f.page.evaluate(()=>{window.__liquidClearedHost.dispatchEvent(new PointerEvent('pointermove',{pointerId:7,clientX:280,clientY:790,bubbles:true}));window.__liquidClearedHost.dispatchEvent(new PointerEvent('pointerup',{pointerId:7,clientX:280,clientY:790,bubbles:true}));});await idle(f.page,'Detached pointer events');assert.equal(await f.page.locator('.bottom-nav').innerHTML(),'');assert.equal(await f.read(),before);assert.deepEqual(f.errors,[]);console.log('PASS lifecycle: profile/desktop cancel active drag, resize refraction realigns, auth clearing cancels retained handlers and frames');
 }finally{await f.context.close();}
}
async function delayedCancellation(browser,origin){
 const f=await open(browser,origin);try{
  const before=await f.read(),active=await drag(f.page,'mouse',{end:false});
  await f.page.locator('.profile-button').evaluate(node=>node.click());
  await f.page.waitForTimeout(900);const [home]=await boxes(f.page);
  await active.pointer.move(home);await active.pointer.end();await f.page.waitForTimeout(settle);
  const cancelled=await snapshot(f.page);assert.equal(cancelled.current,null,'A cancelled long-held drag cannot reopen Home');assert.deepEqual(cancelled.clicks,active.initial.clicks,'Delayed native release is still consumed after cancellation');
  await f.page.locator('.bottom-nav > [data-nav="journal"]').click();await f.page.waitForTimeout(settle);assert.equal((await snapshot(f.page)).current,'journal','A new deliberate pointerdown clears old cancellation suppression');
  assert.equal(await f.read(),before);assert.deepEqual(f.errors,[]);console.log('PASS delayed cancellation: held mouse release cannot navigate; next deliberate click remains native');
 }finally{await f.context.close();}
}
async function reducedMotion(browser,origin){
 const f=await open(browser,origin,{motion:'reduce'});try{
  const before=await f.read(),trace=await frameTrace(f.page,'settings');aligned(trace,'Reduced motion');close(trace.immediate.x,trace.target.x,'Reduced motion snaps on click');for(const frame of trace.frames){close(frame.x,trace.target.x,'Reduced motion has no intermediate spring');neutral(frame,'Reduced motion');}
  await f.page.locator('.bottom-nav > [data-nav="home"]').click();const [home,,settings]=await boxes(f.page),initial=await snapshot(f.page),pointer=await begin(f.page,'touch',home);for(let i=1;i<=6;i++){await pointer.move({x:home.x+(settings.x-home.x)*i/6,y:home.y});const frame=await snapshot(f.page);neutral(frame,'Reduced drag');close(frame.x,initial.x,'Reduced drag preview stays still');assert.equal(frame.current,'home');}await pointer.end();const final=await snapshot(f.page);assert.equal(final.current,'settings');neutral(final,'Reduced release');await idle(f.page,'Reduced motion');assert.equal(await f.read(),before);assert.deepEqual(f.errors,[]);console.log('PASS reduced motion: no spring, deformation or drag preview, immediate release and bounded idle');
 }finally{await f.context.close();}
}
async function visualDemo(browser,origin){
 const f=await open(browser,origin,{record:true});try{
  const [home,,settings]=await boxes(f.page),pointer=await begin(f.page,'mouse',home);
  for(let step=1;step<=12;step++){await pointer.move({x:home.x+(settings.x-home.x)*step/12,y:home.y});if(step===6&&output)await f.page.screenshot({path:path.join(output,'liquid-mid-drag.png')});await f.page.waitForTimeout(24);}
  await pointer.end();await f.page.waitForTimeout(settle);if(output)await f.page.screenshot({path:path.join(output,'liquid-after-drag.png')});
  await f.page.locator('.bottom-nav > [data-nav=home]').click();await f.page.waitForTimeout(settle);console.log('PASS synthetic liquid visual demonstration');
 }finally{await f.context.close();}
}
(async()=>{if(output)fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;let browser;try{browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});if(process.argv.includes('--demo'))await visualDemo(browser,origin);else if(process.argv.includes('--touch-only'))await interactions(browser,origin,['touch']);else{await opticalCases(browser,origin);await interactions(browser,origin);await lifecycle(browser,origin);await delayedCancellation(browser,origin);await reducedMotion(browser,origin);}}finally{await browser?.close();server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
