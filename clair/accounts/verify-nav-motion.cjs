// Actual-index navigation regression with a fictional local budget. No account or external service.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),key='clair-github-money-v3',baseline=process.argv.includes('--baseline');
const baselineHtml=baseline?execFileSync('git',['show','3ac89db:clair/index.html'],{cwd:path.resolve(root,'..'),encoding:'utf8'}):null;
const output=process.env.CLAIR_NAV_MOTION_OUTPUT;
const seed=theme=>({version:3,currency:'EUR',initialized:true,setupDone:true,openingCents:100000,openingBalanceDate:'2026-10-01',transactions:[{id:'fictional-saving',type:'expense',categoryId:'epargne',savingsProjectId:'reserve',amountCents:3000,date:'2026-10-02',name:'Réserve fictive'},{id:'fictional-shop',type:'expense',categoryId:'alimentation',amountCents:1200,date:'2026-10-03',name:'Courses fictives'}],rules:[],skipped:[],budgets:{alimentation:100},budgetOverrides:{},customCategories:[],savingsGoal:0,savingsSchema:1,savingsProjects:[{id:'reserve',name:'Réserve',kind:'autre',icon:'star',color:'violet',targetCents:50000,targetDate:null,archived:false}],fixedExpenses:[],preferences:{theme,wallpaper:'plain',photo:null,reminders:false,guideVersion:1,profileName:'Alex'}});
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(baselineHtml&&pathname==='/index.html'){res.setHeader('content-type','text/html;charset=utf-8');res.end(baselineHtml);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
async function open(browser,origin,{width=390,theme='light',motion='no-preference',record=false}={}){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:width<721,hasTouch:width<721,colorScheme:theme,reducedMotion:motion,serviceWorkers:'block',...(record&&output?{recordVideo:{dir:output,size:{width,height:844}}}:{})}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.addInitScript(({data,key})=>{window.CLAIR_ACCOUNT_CONFIG=null;localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');localStorage.setItem(key,JSON.stringify(data));},{data:seed(theme),key});
 await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();
 assert.equal(await page.locator('.bottom-nav .glass-nav-indicator').count(),1,'Mobile selection needs one persistent sliding pill instead of replacing active button backgrounds');
 await page.waitForFunction(()=>document.querySelector('.bottom-nav')?.classList.contains('glass-nav-ready'));
 await page.evaluate(()=>{window.__navMotionButtons=[...document.querySelectorAll('.bottom-nav button[data-nav]')];window.__navMotionIndicator=document.querySelector('.bottom-nav .glass-nav-indicator');});
 return {context,page,errors,read:()=>page.evaluate(key=>localStorage.getItem(key),key)};
}
// Measure rendered pixels every actual browser frame. A new background appearing at its destination
// without moving, lost transitions, and snapping rapid retargets all fail these observations.
async function trace(page,action,duration=620){
 return page.evaluate(async({action,duration})=>{
  const nav=document.querySelector('.bottom-nav'),indicator=nav.querySelector('.glass-nav-indicator');
  const sample=time=>{const rect=indicator.getBoundingClientRect(),host=nav.getBoundingClientRect(),style=getComputedStyle(indicator),matrix=new DOMMatrixReadOnly(style.transform);return {time,left:rect.left-host.left,top:rect.top-host.top,width:rect.width,height:rect.height,opacity:Number(style.opacity),transformX:matrix.m41,color:getComputedStyle(nav.querySelector('[data-nav="'+(action.nav||'home')+'"]')).color};};
  const click=id=>nav.querySelector('[data-nav="'+id+'"]').click();
  const result={before:sample(0),samples:[],retarget:null};
  if(action.profile)document.querySelector('.profile-button').click();else click(action.nav);
  result.immediate=sample(0);
  const start=performance.now();let retargeted=false;
  while(performance.now()-start<duration){
   await new Promise(requestAnimationFrame);const elapsed=performance.now()-start;
   if(action.retarget&&!retargeted&&elapsed>=85){const before=sample(elapsed);click(action.retarget);result.retarget={before,after:sample(elapsed)};retargeted=true;}
   result.samples.push(sample(elapsed));
  }
  const active=nav.querySelector('[aria-current="page"]'),host=nav.getBoundingClientRect(),box=active?.getBoundingClientRect();
  result.target=box?{left:box.left-host.left,top:box.top-host.top,width:box.width,height:box.height}:null;
  result.final=sample(performance.now()-start);
  result.indicators=nav.querySelectorAll('.glass-nav-indicator').length;
  result.retained=window.__navMotionIndicator===indicator&&window.__navMotionButtons.every((button,index)=>button===nav.querySelectorAll('button[data-nav]')[index]);
  return result;
 },{action,duration});
}
function closeEnough(actual,expected,message){assert(Math.abs(actual-expected)<=1.5,message+': '+actual+' vs '+expected);}
function aligned(result,label){
 assert(result.target,label+' has a selected destination');
 for(const dimension of ['left','top','width','height'])closeEnough(result.final[dimension],result.target[dimension],label+' pill '+dimension+' follows the selected button');
 assert.equal(result.indicators,1,label+' never duplicates the indicator');assert.equal(result.retained,true,label+' preserves all buttons and the indicator');
}
function sliding(result,label){
 aligned(result,label);const start=result.before.left,end=result.final.left,low=Math.min(start,end),high=Math.max(start,end);
 assert(high-low>40,label+' must actually change destination');
 closeEnough(result.immediate.left,start,label+' begins where the existing pill was painted');
 const middle=result.samples.filter(frame=>frame.left>low+2&&frame.left<high-2);
 assert(middle.length>=3,label+' must paint intermediate positions rather than jump: '+JSON.stringify(result));
 assert(new Set(middle.map(frame=>frame.left.toFixed(1))).size>=3,label+' must keep sliding across frames');
 assert(middle.some(frame=>frame.transformX>Math.min(result.before.transformX,result.final.transformX)+1&&frame.transformX<Math.max(result.before.transformX,result.final.transformX)-1),label+' uses a continuously changing transform');
 assert(result.samples.every(frame=>frame.left>=low-1.5&&frame.left<=high+1.5),label+' stays within its departure and destination');
 assert(new Set(result.samples.map(frame=>frame.color)).size>1,label+' icon and label color changes are eased');
}
async function semantics(page,id){
 const nav=page.locator('.bottom-nav');
 assert.equal(await nav.locator('button[data-nav]').count(),3,'All original navigation controls stay buttons');
 assert.equal(await nav.locator('[aria-current="page"]').count(),1,'Exactly one navigation destination is current');
 assert.equal(await nav.locator('[aria-current="page"]').getAttribute('data-nav'),id);
 for(const [destination,label]of [['home','Accueil'],['journal','Historique'],['settings','Réglages']])assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('data-nav'),destination);
 const decoration=await nav.locator('.glass-nav-indicator').evaluate(node=>({hidden:node.getAttribute('aria-hidden'),tabIndex:node.tabIndex,pointerEvents:getComputedStyle(node).pointerEvents}));
 assert.equal(decoration.hidden,'true');assert(decoration.tabIndex<0);assert.equal(decoration.pointerEvents,'none','The moving decoration cannot intercept a tap');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'The capsule cannot overflow the viewport');
}
async function mobile(browser,origin,width,theme){
 const f=await open(browser,origin,{width,theme,record:width===390&&theme==='light'});
 try{
  const before=await f.read();await semantics(f.page,'home');
  await f.page.locator('.bottom-nav [data-nav="journal"]').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:7,button:0,isPrimary:true});
  await f.page.waitForTimeout(70);
  const forward=await trace(f.page,{nav:'journal'});sliding(forward,width+'px '+theme+' home → journal');await semantics(f.page,'journal');
  const backward=await trace(f.page,{nav:'home'});sliding(backward,width+'px '+theme+' journal → home');
  const rapid=await trace(f.page,{nav:'settings',retarget:'journal'});aligned(rapid,'Rapid retarget');
  assert(rapid.retarget,'The test retargets during an active slide');
  closeEnough(rapid.retarget.after.left,rapid.retarget.before.left,'Retargeting continues from the currently painted position');
  assert(rapid.samples.some(frame=>frame.time<rapid.retarget.before.time&&frame.left>rapid.before.left+2),'The pill was already moving before the second tap');
  const afterRetarget=rapid.samples.filter(frame=>frame.time>rapid.retarget.before.time+1);
  assert(afterRetarget.some(frame=>Math.abs(frame.left-rapid.final.left)>2),'Retargeting itself still slides');await semantics(f.page,'journal');
  const profile=await trace(f.page,{profile:true},420);
  assert.equal(await f.page.locator('.bottom-nav [aria-current="page"]').count(),0,'Profile has no falsely selected navigation destination');
  assert.equal(await f.page.locator('.bottom-nav button.active').count(),0);
  assert(profile.final.opacity<=.01,'The pill disappears when no navigation item is selected');
  assert(profile.samples.some(frame=>frame.opacity>0.01&&frame.opacity<.99),'Deselection fades without a flash');
  closeEnough(profile.final.left,profile.before.left,'Deselection keeps the last position while fading');assert(profile.retained);
  const home=f.page.locator('.bottom-nav [data-nav="home"]');await home.focus();await f.page.keyboard.press('Enter');await f.page.locator('.balance-section').waitFor();
  assert(await home.evaluate(node=>document.activeElement===node),'Keyboard activation preserves the focused button across render');
  assert(await home.evaluate(node=>{const style=getComputedStyle(node);return (style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0)||style.boxShadow!=='none';}),'Keyboard focus remains visible');
  await f.page.waitForTimeout(420);await semantics(f.page,'home');
  assert.equal(await f.read(),before,'Navigation and focus must never rewrite financial JSON');assert.deepEqual(f.errors,[]);
  if(output&&width===390&&theme==='light'){fs.writeFileSync(path.join(output,'nav-frames.json'),JSON.stringify({forward,backward,rapid,profile},null,2));await f.page.screenshot({path:path.join(output,'nav-settled-390.png')});}
  console.log('PASS '+width+'px '+theme+': real intermediate frames, reverse/rapid slide, profile fade, retained controls, keyboard and unchanged financial JSON');
 }finally{await f.context.close();}
}
async function resize(browser,origin){
 const f=await open(browser,origin,{width:390});try{
  const before=await f.read();await trace(f.page,{nav:'settings'});
  for(const width of [320,700,1440,390]){
   await f.page.setViewportSize({width,height:844});await f.page.waitForTimeout(450);
   const nav=f.page.locator('.bottom-nav');
   if(width>720){assert(await nav.isHidden());assert(await f.page.locator('.sidebar').isVisible(),'Desktop retains the sidebar');await f.page.locator('.nav [data-nav="journal"]').click();}
   else{assert(await nav.isVisible());const snapshot=await trace(f.page,{nav:width===390?'home':'settings'},460);aligned(snapshot,width+'px resize');}
   assert(await f.page.evaluate(()=>window.__navMotionButtons.every((button,index)=>button===document.querySelectorAll('.bottom-nav button[data-nav]')[index])),'Resizing and desktop navigation retain mobile controls');
  }
  assert.equal(await f.read(),before);assert.deepEqual(f.errors,[]);console.log('PASS mobile/desktop resize: measured pill follows retained navigation after layout changes');
 }finally{await f.context.close();}
}
async function reducedMotion(browser,origin){
 const f=await open(browser,origin,{width:390,motion:'reduce'});try{
  const before=await f.read(),result=await trace(f.page,{nav:'settings'},100);aligned(result,'Reduced motion');
  closeEnough(result.immediate.left,result.target.left,'Reduced motion changes destination immediately');
  assert(result.samples.every(frame=>Math.abs(frame.left-result.target.left)<1.5),'Reduced motion paints no intermediate slide');
  const profile=await trace(f.page,{profile:true},80);assert(profile.immediate.opacity<=.01,'Reduced motion hides a deselected pill immediately');
  assert.equal(await f.read(),before);assert.deepEqual(f.errors,[]);console.log('PASS reduced motion: immediate destination and deselection, unchanged financial JSON');
 }finally{await f.context.close();}
}
(async()=>{
 if(output)fs.mkdirSync(output,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{for(const width of [320,390])for(const theme of ['light','dark'])await mobile(browser,origin,width,theme);await resize(browser,origin);await reducedMotion(browser,origin);}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
