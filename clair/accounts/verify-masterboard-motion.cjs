// Actual Masterboard with fictional Auth and snapshot responses. Every external request is intercepted.
// Only navigation, authentication fixture transitions and CSS animation timing are exercised; no admin mutation is allowed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),baseline=process.argv.includes('--baseline'),output=process.env.MASTERBOARD_MOTION_OUTPUT,settle=760;
const frozen=new Map(baseline?['index.html','masterboard.css','admin-ui.css','masterboard.js'].map(file=>['masterboard/'+file,execFileSync('git',['show','ea2a55e:masterboard/'+file],{cwd:root})]):[]);
const server=http.createServer((req,res)=>{
 const relative=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html').slice(1),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream');res.end(frozen.get(relative)||fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
function fixture(){return {actor:{id:admin,email:'owner@example.invalid'},settings:{mode:'free',monthly_cents:199,payment_phone:''},today:'2026-11-12',users:[{id:admin,email:'owner@example.invalid',name:'Administrateur fictif',confirmed:true,is_admin:true,created_at:'2026-01-01',last_sign_in_at:null},{id:member,email:'camille@example.invalid',name:'Camille Martin',confirmed:true,is_admin:false,created_at:'2026-11-04',last_sign_in_at:null}],requests:[],messages:[],audit:[]};}
async function open(browser,origin,{width=390,motion='no-preference',forcedColors='none',signedIn=true,skipIntro=true}={}){
 const board=fixture(),exp=Math.floor(Date.now()/1000)+3600,user={id:admin,email:board.actor.email,aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01',last_sign_in_at:new Date().toISOString(),user_metadata:{},app_metadata:{provider:'email'},identities:[]};
 const jwt=[{alg:'HS256',typ:'JWT'},{sub:admin,aud:'authenticated',role:'authenticated',exp},'FIXTURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.'),session={access_token:jwt,refresh_token:'FIXTURE',expires_in:3600,expires_at:exp,token_type:'bearer',user};
 const context=await browser.newContext({viewport:{width,height:900},isMobile:false,hasTouch:true,reducedMotion:motion,forcedColors,serviceWorkers:'block'}),page=await context.newPage(),errors=[],calls=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin===origin)return route.continue();
  if(url.hostname!=='hkssnbvktfscizojhftl.supabase.co'){external.push(url.href);return route.abort();}
  let result;
  if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname==='/auth/v1/logout')result={};
  else if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password')result=session;
  else if(url.pathname==='/functions/v1/clair-masterboard'){
   const input=request.postDataJSON();calls.push(input);
   assert.equal(input.action,'snapshot','Motion checks must never invoke an admin mutation');result=board;
  }else{external.push(url.href);return route.abort();}
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
 });
 await page.addInitScript(({session,signedIn})=>{
  if(signedIn)sessionStorage.setItem('clair-masterboard-session-v1',JSON.stringify(session));
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();window.__masterMotionRaf={pending,requested:0,called:0};
  window.requestAnimationFrame=callback=>{window.__masterMotionRaf.requested++;const id=request(time=>{pending.delete(id);window.__masterMotionRaf.called++;callback(time);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
  window.__masterMotionClicks=[];document.addEventListener('click',event=>{const tab=event.target.closest?.('.tabs > button[data-tab]');if(tab)window.__masterMotionClicks.push(tab.dataset.tab);});
 },{session,signedIn});
 await page.goto(origin+'/masterboard/');await page.waitForFunction(()=>document.body.dataset.session==='ready');
 if(signedIn)await page.locator('#board').waitFor({state:'visible'});
 if(skipIntro){await page.keyboard.press('Escape');await page.locator('#intro').waitFor({state:'detached'});}
 return {page,context,errors,calls,external,check:()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(calls.every(call=>call.action==='snapshot'));}};
}
function close(actual,expected,label,tolerance=1.5){assert(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=tolerance,label+': '+actual+' vs '+expected);}
async function requireLens(page){if(!baseline)await page.locator('.tabs > .glass-nav-indicator').waitFor({state:'attached',timeout:5000});assert.equal(await page.locator('.tabs > .glass-nav-indicator').count(),1,'Mobile Masterboard needs the shared CLAIR liquid navigation lens');await page.waitForFunction(()=>document.querySelector('.tabs')?.classList.contains('glass-nav-ready'));}
async function snapshot(page){return page.evaluate(()=>{
 const host=document.querySelector('.tabs'),outer=host.querySelector('.glass-nav-indicator'),drop=outer?.querySelector('.glass-nav-droplet'),h=host.getBoundingClientRect(),box=outer?.getBoundingClientRect(),style=drop?getComputedStyle(drop):null,m=style?new DOMMatrixReadOnly(style.transform):null;
 return {time:performance.now(),x:box?.left-h.left,y:box?.top-h.top,width:box?.width,height:box?.height,dropWidth:drop?.getBoundingClientRect().width,dropHeight:drop?.getBoundingClientRect().height,sx:m?.m11,sy:m?.m22,skew:m?.m21,current:host.querySelector('[aria-current="page"]')?.dataset.tab||null,clicks:window.__masterMotionClicks.slice()};
});}
async function trace(page,tab,retarget=null,duration=settle){return page.evaluate(async({tab,retarget,duration})=>{
 const host=document.querySelector('.tabs'),outer=host.querySelector('.glass-nav-indicator'),buttons=[...host.querySelectorAll(':scope > button[data-tab]')];
 const sample=()=>{const h=host.getBoundingClientRect(),box=outer.getBoundingClientRect(),drop=outer.querySelector('.glass-nav-droplet'),d=drop.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(drop).transform);return {time:performance.now(),x:box.left-h.left,y:box.top-h.top,width:box.width,height:box.height,dropWidth:d.width,dropHeight:d.height,sx:m.m11,sy:m.m22,skew:m.m21};};
 const result={before:sample(),frames:[]};host.querySelector('[data-tab="'+tab+'"]').click();result.immediate=sample();const start=performance.now();let changed=false;
 while(performance.now()-start<duration){await new Promise(requestAnimationFrame);if(retarget&&!changed&&performance.now()-start>=85){result.retargetBefore=sample();host.querySelector('[data-tab="'+retarget+'"]').click();result.retargetAfter=sample();changed=true;}result.frames.push(sample());}
 result.final=sample();const box=host.querySelector('[aria-current="page"]').getBoundingClientRect(),h=host.getBoundingClientRect();result.target={x:box.left-h.left,y:box.top-h.top,width:box.width,height:box.height};result.retained=outer===host.querySelector('.glass-nav-indicator')&&buttons.every((button,i)=>button===host.querySelectorAll(':scope > button[data-tab]')[i]);return result;
 },{tab,retarget,duration});}
function neutral(frame,label){close(frame.sx,1,label+' neutral horizontal scale',.006);close(frame.sy,1,label+' neutral vertical scale',.006);close(frame.skew,0,label+' neutral skew',.006);}
function aligned(result,label){for(const field of ['x','y','width','height'])close(result.final[field],result.target[field],label+' lens '+field);neutral(result.final,label);assert(result.retained,label+' retains native controls and lens during view changes');}
async function semantics(page,tab,{lens=true}={}){
 const host=page.locator('.tabs');assert.equal(await host.locator(':scope > button').count(),3,'The lens never duplicates native controls');
 for(const [id,label]of [['accounts','Comptes'],['messages','Relances'],['settings','Réglages']]){
  const control=host.getByRole('tab',{name:label,exact:true}),selected=id===tab;assert.equal(await control.getAttribute('data-tab'),id);assert.equal(await control.getAttribute('data-nav'),id);assert.equal(await control.getAttribute('aria-selected'),String(selected));assert.equal(await control.getAttribute('tabindex').then(value=>value===null?0:Number(value)),selected?0:-1);assert.equal(await control.getAttribute('aria-current'),selected?'page':null);assert.equal(await page.locator('#'+id+'-view').isVisible(),selected);
 }
 assert.equal(await host.locator('[aria-selected="true"]').count(),1);assert.equal(await host.locator('[aria-current="page"]').count(),1);
 if(lens){
  const detail=await host.locator('.glass-nav-indicator').evaluate(node=>({hidden:node.getAttribute('aria-hidden'),inert:node.inert,pointers:getComputedStyle(node).pointerEvents,tabIndex:node.tabIndex,interactive:node.querySelectorAll('button,a,input,select,textarea,[tabindex],[id],[data-tab],[data-nav],[aria-current],[aria-selected]').length,copies:[...node.querySelectorAll('.glass-nav-lens-item')].map(copy=>copy.textContent.trim())}));
  assert.equal(detail.hidden,'true');assert(detail.inert);assert.equal(detail.pointers,'none');assert(detail.tabIndex<0);assert.equal(detail.interactive,0,'Optical copies expose no IDs, controls or tab semantics');assert.deepEqual(detail.copies,['Comptes','Relances','Réglages']);
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The dock never causes horizontal overflow');
}
async function optics(page,label){
 const result=await page.evaluate(()=>{
  const host=document.querySelector('.tabs'),outer=host.querySelector('.glass-nav-indicator'),drop=outer.querySelector('.glass-nav-droplet'),dock=document.querySelector('.app-sidebar'),bar=dock.getBoundingClientRect(),box=drop.getBoundingClientRect(),centre={x:box.left+box.width/2,y:box.top+box.height/2},copies=[...outer.querySelectorAll('.glass-nav-lens-item')],buttons=[...host.querySelectorAll(':scope > button[data-tab]')],rect=node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height};};
  return {centre,height:box.height,top:box.top-bar.top,bottom:bar.bottom-box.bottom,radius:getComputedStyle(drop).borderTopLeftRadius,rim:getComputedStyle(drop,'::after').backgroundImage,items:buttons.flatMap((button,i)=>['svg',':scope > span:last-child'].map(selector=>({original:rect(button.querySelector(selector)),copy:rect(copies[i].querySelector(selector))})))};
 });
 assert(!result.radius.includes('%'),label+' uses circular capsule ends');for(const radius of result.radius.split(' ').map(parseFloat))close(radius,result.height/2,label+' radius',.7);close(result.top,result.bottom,label+' equal vertical dock insets',.7);assert.notEqual(result.rim,'none',label+' optical rim');
 for(const item of result.items){const scale=item.copy.width/item.original.width;assert(scale>1.08&&scale<1.28,label+' visibly magnifies each real icon and label: '+scale);close(item.copy.x,result.centre.x+(item.original.x-result.centre.x)*scale,label+' registered content x',2);close(item.copy.y,result.centre.y+(item.original.y-result.centre.y)*scale,label+' registered content y',2);}
}
async function idle(page,label){await page.waitForTimeout(settle);const read=()=>page.evaluate(()=>({requested:window.__masterMotionRaf.requested,called:window.__masterMotionRaf.called,pending:window.__masterMotionRaf.pending.size})),before=await read();await page.waitForTimeout(120);assert.deepEqual(await read(),before,label+' stops frame work');assert.equal(before.pending,0,label+' leaves no queued frame');}
async function boxes(page){return page.locator('.tabs > button[data-tab]').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}));}
async function beginTouch(page,start){const cdp=await page.context().newCDPSession(page),send=(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{x:point.x,y:point.y,id:7,radiusX:2,radiusY:2}]:[]});await send('touchStart',start);return {move:point=>send('touchMove',point),end:async(cancel=false)=>{await send(cancel?'touchCancel':'touchEnd');await cdp.detach();}};}
async function drag(page,{cancel=false,vertical=false,end=true}={}){
 const [home,,settings]=await boxes(page),initial=await snapshot(page),pointer=await beginTouch(page,home),frames=[];
 for(let step=1;step<=10;step++){await pointer.move({x:home.x+(vertical?2:(settings.x-home.x)*step/10),y:home.y-(vertical?66*step/10:0)});await page.waitForTimeout(18);const frame=await snapshot(page);frames.push(frame);assert.equal(frame.current,'accounts','A pending gesture does not change the view');assert.deepEqual(frame.clicks,initial.clicks,'A pending gesture never clicks');}
 if(!vertical){assert(new Set(frames.map(frame=>frame.x.toFixed(1))).size>=7,'Trusted touch follows continuous positions across slots');close(frames[4].x-initial.x,(settings.x-home.x)/2,'The lens follows the trusted touch',20);}
 if(!end)return {initial,frames,pointer};await pointer.end(cancel);await page.waitForTimeout(settle);const final=await snapshot(page);assert.equal(final.current,cancel||vertical?'accounts':'settings');assert.deepEqual(final.clicks,cancel||vertical?initial.clicks:[...initial.clicks,'settings'],'Only completed horizontal release invokes navigation once');neutral(final,'Gesture cleanup');return {initial,frames,final};
}
async function navigation(browser,origin){
 const f=await open(browser,origin);try{
  await requireLens(f.page);await semantics(f.page,'accounts');await optics(f.page,'390px');
  const forward=await trace(f.page,'settings');aligned(forward,'Forward');close(forward.immediate.x,forward.before.x,'The spring starts at the painted position');assert(forward.frames.filter(frame=>Math.abs(frame.x-forward.before.x)>3&&Math.abs(frame.x-forward.final.x)>3).length>=3,'Selection paints at least three intermediate positions');assert(forward.frames.some(frame=>frame.dropWidth>forward.before.dropWidth+4),'The shared droplet visibly stretches');assert(forward.frames.some(frame=>frame.dropHeight<forward.before.dropHeight-1.5),'The shared droplet visibly squashes');await semantics(f.page,'settings');
  const reverse=await trace(f.page,'accounts');aligned(reverse,'Reverse');const rapid=await trace(f.page,'settings','messages');aligned(rapid,'Rapid retarget');close(rapid.retargetAfter.x,rapid.retargetBefore.x,'Rapid retarget starts from the painted position');assert(rapid.frames.some(frame=>frame.time>rapid.retargetAfter.time&&Math.abs(frame.x-rapid.final.x)>2),'Retarget keeps moving across frames');await semantics(f.page,'messages');await optics(f.page,'Settled relances');
  await f.page.locator('#tab-accounts').click();await f.page.waitForTimeout(settle);const touch=await drag(f.page);await semantics(f.page,'settings');
  const message=(await boxes(f.page))[1],tap=await beginTouch(f.page,message),clicks=(await snapshot(f.page)).clicks;await tap.end();await f.page.waitForTimeout(settle);assert.deepEqual((await snapshot(f.page)).clicks,[...clicks,'messages'],'A fresh trusted tap after drag routes once');await semantics(f.page,'messages');
  await f.page.locator('#tab-accounts').click();await f.page.waitForTimeout(settle);await drag(f.page,{vertical:true});await drag(f.page,{cancel:true});await semantics(f.page,'accounts');
  await f.page.locator('#tab-accounts').focus();await f.page.keyboard.press('End');await semantics(f.page,'settings');assert(await f.page.locator('#tab-settings').evaluate(node=>node===document.activeElement),'End moves focus to the selected native tab');await f.page.keyboard.press('Home');await semantics(f.page,'accounts');await f.page.keyboard.press('ArrowRight');await semantics(f.page,'messages');await f.page.keyboard.press('Enter');assert(await f.page.locator('#tab-messages').evaluate(node=>node===document.activeElement),'Enter retains native tab focus');
  assert(await f.page.locator('#tab-messages').evaluate(node=>{const s=getComputedStyle(node);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0||s.boxShadow!=='none';}),'Keyboard focus stays visible');await idle(f.page,'Navigation');
  if(output){fs.writeFileSync(path.join(output,'masterboard-motion-trace.json'),JSON.stringify({forward,reverse,rapid,touch},null,2));await f.page.screenshot({path:path.join(output,'masterboard-liquid-390.png')});}f.check();console.log('PASS Masterboard liquid navigation: intermediate spring/rapid retarget, registered magnification, trusted touch/vertical/cancel, inert copies, native tab semantics and keyboard');
 }finally{await f.context.close();}
}
async function lifecycle(browser,origin){
 const f=await open(browser,origin);try{
  await requireLens(f.page);await f.page.locator('#tab-settings').click();await f.page.locator('#tab-settings').focus();
  for(const width of [760,761,390]){
   await f.page.setViewportSize({width,height:900});await f.page.waitForTimeout(120);assert.equal(await f.page.locator('.tabs > .glass-nav-indicator').count(),width<=760?1:0,width+'px applies the mobile boundary');await semantics(f.page,'settings',{lens:width<=760});assert.equal(await f.page.locator('.tabs').getAttribute('aria-orientation'),width<=760?'horizontal':'vertical');assert(await f.page.locator('#tab-settings').evaluate(node=>node===document.activeElement),width+'px restores logical native tab focus');
  }
  await f.page.keyboard.press('Home');await f.page.waitForTimeout(settle);const active=await drag(f.page,{end:false});await f.page.setViewportSize({width:761,height:900});await active.pointer.end();await f.page.waitForTimeout(settle);assert.equal(await f.page.locator('.glass-nav-indicator').count(),0);await semantics(f.page,'accounts',{lens:false});assert.deepEqual((await snapshot(f.page)).clicks,active.initial.clicks,'A drag cancelled by desktop resize cannot commit via a stale button');await idle(f.page,'Desktop teardown');
  await f.page.setViewportSize({width:390,height:900});await requireLens(f.page);await optics(f.page,'Return from desktop');await f.page.locator('#tab-settings').click();await f.page.waitForTimeout(settle);await f.page.locator('#logout').click();await f.page.locator('#login').waitFor({state:'visible'});assert.equal(await f.page.locator('.glass-nav-indicator').count(),0,'Logout disposes the hidden lens');assert.equal(await f.page.locator('.tabs').evaluate(node=>node.classList.contains('glass-nav-motion')),false);assert.equal(await f.page.locator('#users').innerHTML(),'');await idle(f.page,'Logout teardown');
  await f.page.locator('#email').fill('owner@example.invalid');await f.page.locator('#password').fill('Fictional-only-password');await f.page.locator('#login-form button[type=submit]').click();await f.page.locator('#board').waitFor({state:'visible'});await requireLens(f.page);await semantics(f.page,'settings');await f.page.locator('#tab-accounts').click();await f.page.waitForTimeout(settle);await semantics(f.page,'accounts');assert.equal(await f.page.evaluate(()=>localStorage.length),0,'Motion introduces no directory cache');f.check();console.log('PASS Masterboard lifecycle: 760/761 boundary, native focus, desktop cancels trusted drag, logout disposes optics, fixture re-login retains coherent view');
 }finally{await f.context.close();}
}
async function fallbacks(browser,origin){
 const reduced=await open(browser,origin,{motion:'reduce'});try{await requireLens(reduced.page);const result=await trace(reduced.page,'settings',null,120);aligned(result,'Reduced motion');close(result.immediate.x,result.target.x,'Reduced motion snaps immediately');for(const frame of result.frames){close(frame.x,result.target.x,'Reduced motion has no spring');neutral(frame,'Reduced motion');}await semantics(reduced.page,'settings');reduced.check();}finally{await reduced.context.close();}
 const forced=await open(browser,origin,{forcedColors:'active',motion:'reduce'});try{await requireLens(forced.page);await forced.page.locator('#tab-messages').click();await semantics(forced.page,'messages');assert(await forced.page.locator('.glass-nav-indicator').isHidden(),'Forced colors hides optical decoration');const fill=await forced.page.locator('#tab-messages').evaluate(node=>({background:getComputedStyle(node).backgroundColor,outline:getComputedStyle(node).outlineStyle}));assert.notEqual(fill.background,'rgba(0, 0, 0, 0)','Forced colors retains a native selected surface');assert.notEqual(fill.outline,'none');forced.check();}finally{await forced.context.close();}
 const desktop=await open(browser,origin,{width:1440,motion:'reduce'});try{assert.equal(await desktop.page.locator('.glass-nav-indicator').count(),0,'Desktop creates no liquid navigation');await desktop.page.locator('#tab-messages').click();await semantics(desktop.page,'messages',{lens:false});desktop.check();}finally{await desktop.context.close();}console.log('PASS Masterboard fallbacks: reduced motion snaps, forced colors exposes selection, desktop creates no optical navigation');
}
async function intro(browser,origin){
 for(const width of [320,390,1440]){
  const f=await open(browser,origin,{width,signedIn:false,skipIntro:false});try{
   assert.equal(await f.page.locator('.glass-nav-indicator').count(),0,'Signed-out page creates no liquid navigation');
   const samples=await f.page.evaluate(async()=>{
    const host=document.querySelector('#intro'),row=host.querySelector('.intro-letters'),letters=[...row.children],animations=host.getAnimations({subtree:true}).filter(animation=>animation.effect?.target&&letters.includes(animation.effect.target));
    if(animations.length!==letters.length)throw Error('Every intro glyph needs its own translation animation');animations.forEach(animation=>animation.pause());const result=[];
    for(const fraction of [0,.32,.58,.75,.9,1]){
     for(const animation of animations){const t=animation.effect.getTiming();animation.currentTime=Number(t.delay)+Number(t.duration)*fraction;}
     await new Promise(requestAnimationFrame);result.push({fraction,letters:letters.map(node=>{const s=getComputedStyle(node),m=new DOMMatrixReadOnly(s.transform),r=node.getBoundingClientRect();return {text:node.textContent,matrix:[m.m11,m.m12,m.m13,m.m14,m.m21,m.m22,m.m23,m.m24,m.m31,m.m32,m.m33,m.m34],width:r.width,height:r.height,layoutWidth:node.offsetWidth,layoutHeight:node.offsetHeight,x:r.x,y:r.y,right:r.right,opacity:Number(s.opacity)};})});
    }
    window.__masterIntroAnimations=animations;return result;
   });
   for(const sample of samples)for(const letter of sample.letters){const identity=[1,0,0,0,0,1,0,0,0,0,1,0];letter.matrix.forEach((value,i)=>close(value,identity[i],width+'px intro '+letter.text+' remains undistorted at '+sample.fraction,.001));close(letter.width,letter.layoutWidth,'Intro glyph width stays natural',1);close(letter.height,letter.layoutHeight,'Intro glyph height stays natural',1);}
   const settled=samples.at(-1).letters;assert.equal(settled.map(letter=>letter.text).join(''),'CLAIR.');assert(settled.every(letter=>letter.x>=-1&&letter.right<=width+1&&letter.opacity>=.99),'Settled intro letters remain fully inside the viewport');
   if(output){fs.writeFileSync(path.join(output,'masterboard-intro-'+width+'.json'),JSON.stringify(samples,null,2));await f.page.locator('.intro-brand > p').evaluate(node=>{for(const animation of node.getAnimations()){animation.pause();const timing=animation.effect.getTiming();animation.currentTime=Number(timing.delay)+Number(timing.duration);}});await f.page.screenshot({path:path.join(output,'masterboard-intro-'+width+'.png')});}
   await f.page.evaluate(()=>window.__masterIntroAnimations.forEach(animation=>animation.play()));await f.page.keyboard.press('Escape');await f.page.locator('#intro').waitFor({state:'detached'});assert.equal(await f.page.locator('main').evaluate(node=>node.inert),false,'Skipping intro unlocks the page');f.check();
  }finally{await f.context.close();}
 }
 const f=await open(browser,origin,{motion:'reduce',signedIn:false});try{assert.equal(await f.page.locator('#intro').count(),0);assert.equal(await f.page.locator('main').evaluate(node=>node.inert),false);f.check();}finally{await f.context.close();}console.log('PASS Masterboard intro: computed glyph matrices and bounds stay undistorted at six drop times on 320/390/1440px; reduced motion and Escape unlock the page');
}
async function introImageStages(browser,origin){
 // This neutral geometric SVG tests only the image stage. It is not the user's pending illustration.
 const neutralSvg='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect width="400" height="260" rx="20" fill="#ddd"/><circle cx="200" cy="130" r="55" fill="#999"/></svg>');
 const observe=page=>page.evaluate(()=>{
  const host=document.querySelector('#intro');window.__masterIntroStages=[];
  new MutationObserver(()=>window.__masterIntroStages.push({time:performance.now(),image:host.classList.contains('image-stage'),leaving:host.classList.contains('leaving')})).observe(host,{attributes:true,attributeFilter:['class']});
 });
 for(const exit of ['automatic','Escape','reduced-motion']){
  const f=await open(browser,origin,{signedIn:false,skipIntro:false});try{
   const image=f.page.locator('#intro-after-image');assert.equal(await image.getAttribute('src'),null,'The source has no substitute for the unavailable original illustration');await observe(f.page);
   await image.evaluate((node,source)=>{node.src=source;},neutralSvg);assert.equal(await f.page.locator('.intro-after').isVisible(),false,'The fixture stays hidden until the wordmark finishes');
   await f.page.locator('#intro.image-stage').waitFor({state:'attached',timeout:7000});assert(await f.page.locator('.intro-brand').isHidden(),'The image stage hides the preceding logo');assert(await image.isVisible(),'A decoded image becomes visible after the logo');assert(await f.page.locator('main').evaluate(node=>node.inert),'The page stays inert while the image is shown');
   const shape=await image.evaluate(node=>{const r=node.getBoundingClientRect();return {naturalWidth:node.naturalWidth,naturalHeight:node.naturalHeight,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,fit:getComputedStyle(node).objectFit};});
   assert.equal(shape.naturalWidth,400);assert.equal(shape.naturalHeight,260);close(shape.width/shape.height,shape.naturalWidth/shape.naturalHeight,'The neutral fixture retains its natural aspect ratio',.005);assert.equal(shape.fit,'contain');assert(shape.left>=0&&shape.right<=shape.viewportWidth&&shape.top>=0&&shape.bottom<=shape.viewportHeight,'The entire neutral fixture fits inside the viewport');
   if(output&&exit==='automatic')await f.page.screenshot({path:path.join(output,'masterboard-intro-neutral-fixture.png')});
   if(exit==='Escape')await f.page.keyboard.press('Escape');else if(exit==='reduced-motion')await f.page.emulateMedia({reducedMotion:'reduce'});
   await f.page.locator('#intro').waitFor({state:'detached',timeout:exit==='automatic'?5000:1000});assert.equal(await f.page.locator('main').evaluate(node=>node.inert),false,exit+' image exit unlocks the page');
   if(exit==='automatic'){
    const stages=await f.page.evaluate(()=>window.__masterIntroStages),shown=stages.find(stage=>stage.image&&!stage.leaving),leaving=stages.find(stage=>stage.leaving);assert(shown&&leaving,'The neutral image stage automatically enters the existing exit');assert(leaving.time-shown.time>=1700&&leaving.time-shown.time<=2700,'The neutral fixture remains visible for the intended 1800ms stage');
   }
   f.check();
  }finally{await f.context.close();}
 }
 for(const source of ['missing','invalid']){
  const f=await open(browser,origin,{signedIn:false,skipIntro:false});try{
   const image=f.page.locator('#intro-after-image');assert.equal(await image.getAttribute('src'),null);await observe(f.page);
   if(source==='invalid')await image.evaluate(node=>{node.src='/masterboard/__invalid_motion_fixture__.svg';});
   await f.page.locator('#intro').waitFor({state:'detached',timeout:7500});assert.equal(await f.page.locator('main').evaluate(node=>node.inert),false,source+' illustration never blocks the page');const stages=await f.page.evaluate(()=>window.__masterIntroStages);assert(stages.every(stage=>!stage.image),source+' illustration skips the image stage');assert(stages.some(stage=>stage.leaving),source+' illustration retains the existing exit');f.check();
  }finally{await f.context.close();}
 }
 console.log('PASS optional intro image: explicitly neutral SVG fixture keeps its aspect ratio, auto-exits and supports Escape/media-change; missing/invalid sources skip without blocking');
}
(async()=>{
 if(output)fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});const origin='http://127.0.0.1:'+server.address().port;if(!process.argv.includes('--intro-image-only')){await navigation(browser,origin);await lifecycle(browser,origin);await fallbacks(browser,origin);await intro(browser,origin);}await introImageStages(browser,origin);}finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
