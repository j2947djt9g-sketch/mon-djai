// Approved A on the actual Masterboard. All identities, requests and Auth/admin responses are fictional.
// External requests are intercepted or blocked; the only simulated mutation is one explicit close-help click.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),baseline=process.argv.includes('--baseline'),output=process.env.MASTERBOARD_DESIGN_OUTPUT;
const frozen=new Map(baseline?['index.html','masterboard.css','masterboard.js'].map(file=>['masterboard/'+file,execFileSync('git',['show','28d7b24:masterboard/'+file],{cwd:root})]):[]);
const server=http.createServer((req,res)=>{
 const relative=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html').slice(1),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream');res.end(frozen.get(relative)||fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const ids={admin:'11111111-1111-4111-8111-111111111111',member:'22222222-2222-4222-8222-222222222222',unconfirmed:'33333333-3333-4333-8333-333333333333',odd:'44444444-4444-4444-8444-444444444444',banned:'55555555-5555-4555-8555-555555555555',request:'66666666-6666-4666-8666-666666666666'};
const malicious='<img src=x onerror=alert(1)>',longEmail='a-very-long-admin-directory-identity-with-unbroken-characters-that-must-remain-readable@example.invalid';
function fixture(){
 return {actor:{id:ids.admin,email:'owner@example.invalid'},settings:{mode:'free',monthly_cents:199,payment_phone:''},today:'2026-11-12',users:[
  {id:ids.admin,email:'owner@example.invalid',name:'Administrateur fictif',confirmed:true,is_admin:true,created_at:'2026-01-01',last_sign_in_at:'2026-11-12T09:00:00Z'},
  {id:ids.member,email:'camille@example.invalid',name:'Camille Martin',confirmed:true,is_admin:false,created_at:'2026-11-04',last_sign_in_at:'2026-11-12T09:42:00Z'},
  {id:ids.unconfirmed,email:'sans-nom@example.invalid',name:'',confirmed:false,is_admin:false,created_at:'2026-11-05',last_sign_in_at:null},
  {id:ids.odd,email:longEmail,name:malicious,confirmed:true,is_admin:false,created_at:'2026-11-06',last_sign_in_at:null},
  {id:ids.banned,email:'suspendu@example.invalid',name:'Compte suspendu fictif',confirmed:true,is_admin:false,banned:true,created_at:'2026-11-07',last_sign_in_at:'2026-11-09T09:00:00Z'}
 ],requests:[
  {id:ids.request,email:'CAMILLE@EXAMPLE.INVALID',reason:'access_problem',status:'pending',created_at:'2026-11-12T09:18:00Z',device_label:'iPhone fictif <img src=x>',device_unlock_pending:true},
  {id:'77777777-7777-4777-8777-777777777777',email:'sans-nom@example.invalid',reason:'email_missing',status:'pending',created_at:'2026-11-12T10:18:00Z',device_label:'Appareil fictif',device_unlock_pending:true}
 ],messages:[],audit:[{action:'test_date_changed',created_at:'2026-11-11T12:00:00Z'}]};
}
async function noOverflow(page,label){const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(dimensions.scroll<=dimensions.width+1,label+' must not overflow horizontally: '+JSON.stringify(dimensions));}
async function measureTouchTargets(page,selector,label){for(const target of await page.locator(selector).all()){if(!await target.isVisible())continue;const box=await target.boundingBox();assert(box.width>=43.5&&box.height>=43.5,label+' retains 44px targets: '+JSON.stringify(box));}}
async function readableText(page,selector,label,background=null){
 const colors=await page.locator(selector).first().evaluate((node,background)=>{
  const numbers=value=>value.match(/[\d.]+/g).map(Number);let ancestor=node,bg=background;
  while(!bg&&ancestor){const value=numbers(getComputedStyle(ancestor).backgroundColor);if(value.length===3||value[3]>=.99)bg=value.slice(0,3);ancestor=ancestor.parentElement;}
  return {fg:numbers(getComputedStyle(node).color).slice(0,3),bg:bg||[255,255,255]};
 },background);
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),a=luminance(colors.fg),b=luminance(colors.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert(ratio>=4.5,label+' retains readable text contrast: '+ratio.toFixed(2)+':1 '+JSON.stringify(colors));
}
async function run(browser,origin,width){
 const board=fixture(),exp=Math.floor(Date.now()/1000)+3600,user={id:ids.admin,email:board.actor.email,aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01',last_sign_in_at:new Date().toISOString(),user_metadata:{},app_metadata:{provider:'email'},identities:[]};
 const jwt=[{alg:'HS256',typ:'JWT'},{sub:ids.admin,aud:'authenticated',role:'authenticated',exp},'FIXTURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],calls=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());if(url.origin===origin)return route.continue();
  if(url.hostname!=='hkssnbvktfscizojhftl.supabase.co'){external.push(url.href);return route.abort();}
  let result={};if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname==='/functions/v1/clair-masterboard'){
   const input=request.postDataJSON();calls.push(input);
   if(input.action==='snapshot')result=board;
   else if(input.action==='close-help'){assert.equal(input.id,ids.request);board.requests[0].status='closed';result={ok:true};}
   else throw Error('A design check must never mutate a real/simulated account: '+input.action);
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
 });
 await page.addInitScript(({user,jwt,exp})=>sessionStorage.setItem('clair-masterboard-session-v1',JSON.stringify({access_token:jwt,refresh_token:'FIXTURE',expires_in:3600,expires_at:exp,token_type:'bearer',user})),{user,jwt,exp});
 const profile=id=>page.locator('[data-profile="'+id+'"]'),drawer=page.locator('#profile-drawer'),reset=()=>page.locator('.sensitive-access [data-action="reset"]');
 try{
  await page.goto(origin+'/masterboard/');await page.locator('#board').waitFor({state:'visible'});await page.locator('#intro').waitFor({state:'detached'});
  await page.locator('#accounts-view').scrollIntoViewIfNeeded();
  const card=await profile(ids.member).boundingBox();assert(card.height<150,'A replaces tall empty cards with a compact account identity: '+card.height+'px');
  assert.equal(await page.locator('.card-foot').count(),0,'Repeated empty card footers disappear');
  assert.equal(await profile(ids.unconfirmed).locator('.user-name').innerText(),'Compte sans nom','Missing names must not be guessed from an email');
  assert.equal(await profile(ids.odd).locator('.user-name').innerText(),malicious);assert.equal(await page.locator('.user-card img').count(),0,'HTML-like identity stays text');
  assert.equal(await profile(ids.odd).locator('.user-email').textContent(),longEmail);await noOverflow(page,'Long directory identities');
  await measureTouchTargets(page,'.tabs button,[data-filter-choice]','Navigation/filter');await readableText(page,'.user-email','Directory email');await readableText(page,'.filter-chips button','Filter label');
  if(width<=760){
   const fill=await page.locator('.app-sidebar').evaluate(el=>getComputedStyle(el).backgroundColor),channels=fill.match(/[\d.]+/g)?.map(Number)||[];
   assert(channels.length>=3&&channels.slice(0,3).every(v=>v>180),'Mobile A dock has a light surface: '+fill);
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const bottom=await profile(ids.banned).boundingBox(),dock=await page.locator('.app-sidebar').boundingBox();assert(bottom.y+bottom.height<dock.y,'The final account can scroll clear of the fixed dock');
  }
  const counts={all:5,help:2,unconfirmed:1,banned:1};
  for(const [value,count]of Object.entries(counts)){
   const chip=page.locator('[data-filter-choice="'+value+'"]');await chip.click();assert.equal(await page.locator('#filter').inputValue(),value);assert.equal(await page.locator('.user-card').count(),count,'Chip filters the real snapshot: '+value);assert.equal(await chip.getAttribute('aria-pressed'),'true');
  }
  await page.locator('[data-filter-choice="all"]').click();await page.locator('#search').fill('camille@');assert.equal(await page.locator('.user-card').count(),1);await page.locator('#search').fill('');
  if(output&&width===390)await page.screenshot({path:path.join(output,'masterboard-a-list-390.png')});
  const snapshots=calls.filter(c=>c.action==='snapshot').length;await profile(ids.member).click();await drawer.waitFor({state:'visible'});
  assert.equal(await page.locator('.profile-facts>div').count(),4,'Account facts form one clear four-cell group');
  const identity=await page.locator('.drawer-identity').evaluate(node=>{const a=node.querySelector('.avatar').getBoundingClientRect(),p=node.querySelector('.drawer-person').getBoundingClientRect();return {avatar:{x:a.x,y:a.y,right:a.right},person:{x:p.x,y:p.y}};});
  assert(identity.person.x>=identity.avatar.right+5&&Math.abs(identity.person.y-identity.avatar.y)<30,'Avatar and name share a compact horizontal identity');
  const help=page.locator('.profile-help-card');assert.equal(await help.count(),1,'A case-insensitive matching help request belongs to this profile');await help.locator('summary').click();assert.match(await help.innerText(),/iPhone fictif/);assert.equal(await help.locator('img').count(),0,'Request device labels stay escaped text');
  assert.equal(await reset().innerText().then(s=>s.includes('Autoriser un nouveau mot de passe')),true);assert(await reset().isEnabled());assert.equal(await page.locator('.profile-main-actions [data-action="reset"]').count(),0,'Sensitive access is separate from messages');
  assert.equal(await page.locator('#profile-content').innerText().then(s=>s.includes('Faire sauter')),false);assert.equal(await page.locator('#profile-content [data-action="activity"]').count(),0,'No fictitious per-account admin history action');
  assert.equal(calls.filter(c=>c.action==='snapshot').length,snapshots,'Opening a profile only renders the existing snapshot');assert(calls.every(c=>c.action==='snapshot'),'Search, chips and opening profiles never mutate');
  await readableText(page,'.drawer-email','Profile email');await readableText(page,'.profile-facts dt','Account fact label');await readableText(page,'.request-body','Help instruction',[238,227,248]);await readableText(page,'.reset-availability','Sensitive access explanation');await measureTouchTargets(page,'#close-profile','Profile close');await noOverflow(page,'Profile');if(output&&width===390)await page.screenshot({path:path.join(output,'masterboard-a-profile-390.png')});
  if(width>=768){const box=await drawer.boundingBox();assert(box.x>=width*.35,'Desktop profile remains a lateral panel');}
  const refreshed=page.waitForResponse(response=>response.url().endsWith('/functions/v1/clair-masterboard')&&response.request().postDataJSON()?.action==='snapshot');await page.locator('#refresh').evaluate(button=>button.click());await refreshed;await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);await page.waitForFunction(n=>document.querySelector('#profile-title')?.textContent.includes(n),'Camille Martin');assert.equal(await page.locator('[data-profile][aria-expanded=true]').count(),1,'Refresh keeps exactly one profile selected');
  const details=page.locator('.profile-help-details');await details.locator('summary').click();assert(calls.every(c=>c.action==='snapshot'),'Inspecting a request is read-only');
  await help.locator('[data-action="close-help"][data-id="'+ids.request+'"]').click();await page.waitForFunction(()=>!document.querySelector('.profile-help-card'));
  assert.equal(calls.filter(c=>c.action==='close-help').length,1,'A request is closed only after the deliberate matching click');assert(await reset().isDisabled(),'A closed request cannot still authorize its device');assert(await page.locator('.reset-availability').isVisible());
  await page.locator('#close-profile').press('Escape');await drawer.waitFor({state:'hidden'});assert(await profile(ids.member).evaluate(el=>el===document.activeElement),'Escape returns focus to the opening account');
  await profile(ids.unconfirmed).click();await drawer.waitFor({state:'visible'});assert.equal(await page.locator('.profile-help-card').count(),1);assert(await reset().isEnabled(),'A pending linked device remains recoverable when the address is unconfirmed');assert.match(await page.locator('.profile-summary').innerText(),/confirmer/i);assert.match(await page.locator('.profile-facts').innerText(),/(?:non disponible|indisponible)/i);await page.locator('#close-profile').click();
  await profile(ids.odd).click();await drawer.waitFor({state:'visible'});assert.equal(await page.locator('.profile-help-card').count(),0,'Unrelated requests do not leak into another profile');assert(await reset().isDisabled(),'No pending device request means no reset authorization');assert.equal(await page.locator('#profile-title').innerText(),malicious);assert.equal(await drawer.locator('img').count(),0);await noOverflow(page,'Long-email profile');await page.locator('#close-profile').click();
  await profile(ids.banned).click();await drawer.waitFor({state:'visible'});assert(await reset().isDisabled(),'Suspended account remains unavailable for reset');await page.locator('#close-profile').click();
  await profile(ids.admin).click();await drawer.waitFor({state:'visible'});assert.equal(await page.locator('#profile-content [data-action="delete"],#profile-content [data-action="suspend"]').count(),0,'The administrator remains protected');await page.locator('#close-profile').click();
  await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#users').innerHTML(),'');assert.equal(await page.locator('#profile-content').innerHTML(),'');assert.equal(await page.locator('[data-action="reset"],[data-action="delete"]').count(),0);assert.equal(await drawer.isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.length),0,'No private directory cache is introduced');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(calls.every(c=>['snapshot','close-help'].includes(c.action)));
  console.log('PASS Masterboard A '+width+'px: compact '+card.height+'px safe identities, connected chips, contextual real-snapshot help, separated guarded access, explicit help close, refresh/focus/logout and no overflow');
 }finally{await context.close();}
}
(async()=>{if(output)fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});const origin='http://127.0.0.1:'+server.address().port;for(const width of [320,390,768,1440])await run(browser,origin,width);}finally{await browser?.close();server.close();}})().catch(error=>{console.error(error);process.exitCode=1});
