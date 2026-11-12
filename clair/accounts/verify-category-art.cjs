// Fictional Alex fixture only. Every external request is intercepted; no production writes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline'),screenshots=process.env.CLAIR_CATEGORY_SCREENSHOTS||(fs.existsSync('/workspace/clair-visual-work')?'/workspace/clair-visual-work/screenshots':path.join(os.tmpdir(),'clair-category-art-screenshots'));
const baselineHtml=baseline?execFileSync('git',['show','bb8d9f1:clair/index.html'],{cwd:path.resolve(root,'..'),encoding:'utf8'}):null;
const uid='8450886d-891a-40e2-995e-ea46bb1409bc',exp=1900000000,user={id:uid,aud:'authenticated',role:'authenticated',email:'alex@example.com',user_metadata:{display_name:'Alex'},app_metadata:{provider:'email'},identities:[]};
const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp},'SYNTHETIC'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const catalog=[['alimentation','Alimentation'],['logement','Logement'],['transport','Transport'],['telephone','Téléphone'],['etudes','Études'],['hygiene','Hygiène'],['vetements','Vêtements'],['famille','Famille'],['loisirs','Loisirs'],['abonnements','Abonnements'],['epargne','Épargne'],['imprevus','Imprévus'],['non-classee','Non classée'],['autre','Autre']];
const seed=(currency='MAD')=>({version:3,currency,initialized:true,setupDone:true,openingCents:100000,openingBalanceDate:'2026-11-01',transactions:[
 {id:'fictional-food',type:'expense',amountCents:2500,name:'Courses de la semaine',date:'2026-11-09',categoryId:'alimentation',note:''},
 {id:'fictional-bus',type:'expense',amountCents:300,name:'Trajet en ville',date:'2026-11-10',categoryId:'transport',note:''},
 {id:'fictional-dinner',type:'expense',amountCents:500,name:'Repas partagé',date:'2026-11-10',categoryId:'personal-dinner',note:''},
 {id:'fictional-study',type:'expense',amountCents:500,name:'Carnet de cours',date:'2026-11-11',categoryId:'etudes',note:''}],rules:[],skipped:[],budgets:{alimentation:150,transport:50},budgetOverrides:{},customCategories:[{id:'personal-dinner',label:'Restaurant',icon:'·'}],savingsGoal:0,savingsSchema:1,savingsProjects:[],fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}});
const fixture=()=>`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"><link rel="stylesheet" href="/accounts/category-art.css"><style>body{margin:0;padding:16px;font:16px system-ui;color:#202036;background:#f7f6fc}form{max-width:500px;margin:auto}label{display:block}button,summary,select{font:inherit}#art-sample{display:flex;gap:12px;margin:16px 0}@media(prefers-color-scheme:dark){body{background:#1b1929;color:#f8f6ff}}</style></head><body><form id="fixture-form"><label for="fixture-category">Catégorie de dépense</label><select id="fixture-category" name="categoryId">${catalog.filter(c=>c[0]!=='epargne').map(([id,label])=>`<option value="${id}"${id==='non-classee'?' selected':''}>${label}</option>`).join('')}<option value="personal-dinner">Restaurant</option><option value="personal-unknown">Catégorie personnelle</option></select><label for="fixture-currency">Devise existante</label><select id="fixture-currency" name="currency"><option value="MAD">MAD</option><option value="EUR">EUR</option></select><div id="art-sample"></div><output id="changed"></output></form><script src="/accounts/category-art.js"></script><script>window.testChanges=[];window.testSubmits=0;document.querySelector('form').addEventListener('change',event=>{testChanges.push({name:event.target.name,value:event.target.value,bubbles:event.bubbles});});document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();testSubmits++;});if(window.categoryArtwork){document.querySelector('#art-sample').innerHTML=categoryArtwork({id:'alimentation',label:'Alimentation'})+categoryArtwork({id:'personal-unknown',label:'Catégorie personnelle'});initCategoryArt();}</script></body></html>`;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(baselineHtml&&pathname==='/index.html'){res.setHeader('content-type','text/html');res.end(baselineHtml);return;}
 if(pathname==='/__category-art-fixture'){res.setHeader('content-type','text/html');res.end(fixture());return;}
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
async function appContext(browser,origin,{width=390,currency='MAD',theme='light',failedAtlas=false}={}){
 const payload=seed(currency);payload.preferences.theme=theme;
 let remote={payload,revision:1,operation_id:'synthetic-seed',display_name:'Alex'},writes=0,atlasRequests=0;
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'fr-MA',colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin){if(url.pathname.endsWith('/assets/categories/atlas-v1.webp')){atlasRequests++;if(failedAtlas)return route.abort();}return route.continue();}
  if(url.hostname!=='hkssnbvktfscizojhftl.supabase.co')return route.abort();
  let body={};
  if(url.pathname==='/auth/v1/user')body=user;
  else if(url.pathname==='/rest/v1/clair_budgets')body=remote;
  else if(url.pathname==='/rest/v1/rpc/save_clair_budget'){
   const input=route.request().postDataJSON();assert.equal(input.p_expected_revision,remote.revision);
   remote={payload:input.p_payload,revision:remote.revision+1,operation_id:input.p_operation_id,display_name:'Alex'};writes++;body={saved:true,row:remote};
  }else if(url.pathname.startsWith('/rest/v1/rpc/'))throw Error('Unexpected remote mutation '+url.pathname);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.addInitScript(({user,jwt,exp,theme})=>{localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');localStorage.setItem('clair-account-session-v1',JSON.stringify({access_token:jwt,refresh_token:'SYNTHETIC',expires_in:3600,expires_at:exp,token_type:'bearer',user}));window.__qaTheme=theme;},{user,jwt,exp,theme});
 await page.goto(origin+'/index.html');try{await page.locator('.balance-section').waitFor();}catch(error){error.message+='\nPage errors: '+JSON.stringify(errors);throw error;}
 const read=()=>page.evaluate(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid)),uid);
 return {context,page,errors,read,writes:()=>writes,atlasRequests:()=>atlasRequests,remote:()=>remote};
}
async function screenshotApp(browser,origin,width,theme){
 const f=await appContext(browser,origin,{width,theme}),prefix=baseline?'before':'after';
 try{
  const before=JSON.stringify(await f.read());
  if(!baseline)await f.page.waitForFunction(()=>['ready','failed'].includes(document.documentElement.dataset.categoryArt));
  await f.page.locator('#toast').evaluate(node=>{node.innerHTML='';});
  await f.page.screenshot({path:path.join(screenshots,`category-${prefix}-home-${width}-${theme}.png`),fullPage:true});
  await f.page.locator('[data-nav=journal]:visible').first().click();await f.page.locator('#journal-results').waitFor();
  await f.page.screenshot({path:path.join(screenshots,`category-${prefix}-journal-${width}-${theme}.png`),fullPage:true});
  if(baseline){
   await f.page.locator('[data-nav=profile]:visible').first().click();await f.page.locator('.profile-banner').waitFor();
   await f.page.evaluate(()=>{const drawing='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200"><defs><linearGradient id="g"><stop stop-color="#e9dcff"/><stop offset="1" stop-color="#d8e9ef"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>';document.body.dataset.wall='photo';document.querySelector('.wall').style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(drawing)+'")';});
   await f.page.screenshot({path:path.join(screenshots,`profile-before-photo-${width}-${theme}.png`),fullPage:true});
  }
  assert.equal(JSON.stringify(await f.read()),before,'Rendering illustrated surfaces must not change financial JSON');
  assert(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px ${theme} must not overflow`);
  assert.deepEqual(f.errors,[]);console.log(`PASS ${prefix} synthetic screenshots ${width}px ${theme}, unchanged financial JSON, no overflow`);
 }finally{await f.context.close();}
}
async function verifyPicker(browser,origin,{width,theme,failedAtlas=false}){
 let atlasRequests=0;const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],atlasResponses=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/assets/categories/atlas-v1.webp'))atlasResponses.push({url:response.url(),status:response.status()});});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(url.pathname.endsWith('/assets/categories/atlas-v1.webp')){atlasRequests++;if(failedAtlas)return route.abort();}return route.continue();});
 try{
  await page.goto(origin+'/__category-art-fixture');await page.locator('.category-picker').waitFor();
  await page.waitForFunction(()=>['ready','failed'].includes(document.documentElement.dataset.categoryArt));
  const original=page.locator('#fixture-category');assert.equal(await original.getAttribute('name'),'categoryId');assert.equal(await original.inputValue(),'non-classee');
  assert.equal(await page.locator('#fixture-currency').getAttribute('data-category-enhanced'),null,'Currency dropdowns retain native behavior');
  assert.equal(await page.locator('.category-picker').count(),1);
  await page.evaluate(()=>{initCategoryArt();initCategoryArt();enhanceCategorySelects();});assert.equal(await page.locator('.category-picker').count(),1,'Rerenders do not duplicate a picker');
  const picker=page.locator('.category-picker').first(),trigger=picker.locator('summary');await trigger.click();
  assert.equal(await picker.getByRole('radiogroup',{name:'Catégorie de dépense',exact:true}).count(),1,'The illustration choices retain the native field label: '+JSON.stringify(await picker.evaluate(node=>({open:node.open,label:node.querySelector('[role=radiogroup]').getAttribute('aria-label')}))));
  const options=picker.getByRole('radio');assert.equal(await options.count(),catalog.length+1);assert(await options.first().isVisible(),'Illustrations are visible choices');
  await options.first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
  assert.equal(await original.inputValue(),'personal-unknown');assert.equal(await page.evaluate(()=>new FormData(document.querySelector('form')).get('categoryId')),'personal-unknown');
  assert.deepEqual(await page.evaluate(()=>testChanges),[{name:'categoryId',value:'personal-unknown',bubbles:true}]);
  assert.equal(await page.evaluate(()=>testSubmits),0,'Keyboard category selection must not submit a financial form');
  if(!await picker.evaluate(node=>node.open))await trigger.click();
  await picker.getByRole('radio',{name:'Catégorie personnelle',exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  assert.equal(await original.inputValue(),'logement','Arrow keys move to the next financial category without changing its ID');
  await trigger.click();await page.keyboard.press('Escape');assert.equal(await picker.evaluate(node=>node.open),false);assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
  await page.evaluate(()=>{const select=document.querySelector('#fixture-category');select.value='telephone';select.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await picker.getByRole('radio',{name:'Téléphone',exact:true,includeHidden:true}).getAttribute('aria-checked'),'true','Native changes update the illustrated selection');
  assert.match(await trigger.innerText(),/Téléphone/);
  await page.evaluate(()=>document.querySelector('form').reset());
  await page.waitForFunction(()=>document.querySelector('#fixture-category').value==='non-classee'&&document.querySelector('.category-picker-current').textContent==='Non classée');
  assert.equal(await picker.getByRole('radio',{name:'Non classée',exact:true,includeHidden:true}).getAttribute('aria-checked'),'true','Native form reset also restores the illustrated selection');
  await page.evaluate(()=>{const form=document.querySelector('form');for(const name of ['habitCategoryId','charge-category-fictional']){const label=document.createElement('label');label.textContent='Catégorie supplémentaire';const select=document.createElement('select');select.name=name;select.id=name;select.innerHTML='<option value="transport">Transport</option><option value="loisirs">Loisirs</option>';label.htmlFor=name;form.append(label,select);}});
  await page.waitForFunction(()=>[...document.querySelectorAll('select[name="habitCategoryId"],select[name="charge-category-fictional"]')].every(select=>select.dataset.categoryEnhanced==='true'));
  assert.equal(await page.locator('.category-picker').count(),3,'Newly rendered habit/charge category fields are enhanced once');
  assert.equal(await page.evaluate(()=>new FormData(document.querySelector('form')).get('habitCategoryId')),'transport');
  const safe=await page.evaluate(()=>{const box=document.createElement('div');box.innerHTML=categoryArtwork({id:'unsafe-custom',label:'<img src=x onerror=alert(1)> & "test"'},{decorative:false});document.body.append(box);return {images:box.querySelectorAll('img,[onerror]').length,label:box.querySelector('[aria-label]')?.getAttribute('aria-label')};});
  assert.equal(safe.images,0);assert.equal(safe.label,'<img src=x onerror=alert(1)> & "test"');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const effects=await picker.locator('.category-picker-option,.category-picker-chevron').evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node);return {animation:style.animationName,transition:style.transitionDuration};}));
  assert(effects.every(effect=>effect.animation==='none'&&effect.transition.split(',').every(duration=>duration.trim()==='0s')),'Reduced motion disables all picker transitions');
  const target=await trigger.boundingBox();assert(target.height>=44&&target.width>=44,'The illustrated control retains a mobile touch target');
  if(failedAtlas){assert.equal(await page.locator('html').getAttribute('data-category-art'),'failed');assert(await page.locator('.category-art-vector svg').first().isVisible(),'A missing/offline atlas retains vector illustrations');}
  else{
   assert.equal(await page.locator('html').getAttribute('data-category-art'),'ready');
   const sprite=await page.locator('.category-art-sprite').first().evaluate(node=>{const style=getComputedStyle(node);return {background:style.backgroundImage,opacity:style.opacity};});
   assert(sprite.background.includes(origin+'/assets/categories/atlas-v1.webp'),'The sprite resolves from the app base even with an external CSS file');assert.equal(sprite.opacity,'1');
   assert(atlasResponses.length>=1);assert(atlasResponses.every(response=>response.status===200),'Atlas preload and CSS background requests must both load successfully');
  }
  assert(atlasRequests<=2,'One preload plus the shared CSS atlas request is the maximum, including failure');
  await page.screenshot({path:path.join(screenshots,`category-after-picker-${width}-${theme}${failedAtlas?'-fallback':''}.png`),fullPage:true});
  assert.deepEqual(errors,[]);console.log(`PASS picker ${width}px ${theme}${failedAtlas?' failed atlas fallback':''}: keyboard, accessible names, FormData, bubbling change, native sync, no submit/overflow`);
 }finally{await context.close();}
}
async function verifyExpress(browser,origin,currency,width){
 const f=await appContext(browser,origin,{currency,width});
 try{
  const start=await f.read();assert.equal(start.currency,currency,'Existing currency survives illustration startup');const count=start.transactions.length;
  const entries=currency.startsWith('X')?[['3',300],['25',2500]]:[['0,50',50],['3',300],['25',2500]];
  for(const [index,[raw,cents]]of entries.entries()){
   await f.page.locator('[data-action=express-open]:visible').click();const confirm=f.page.getByRole('button',{name:'Utiliser mon budget Clair',exact:true});if(await confirm.count())await confirm.click();
   const form=f.page.locator('#express-form');await form.waitFor();
   assert.equal((await f.read()).transactions.length,count+index,'Opening/picking an illustration must not debit money');
   const category=form.locator('select[name=categoryId]');assert.equal(await category.inputValue(),'','The optional category keeps automatic suggestion as its default');
   const picker=form.locator('.category-picker');assert.equal(await picker.count(),1);const beforePicking=JSON.stringify(await f.read());
   await form.locator('.express-options > summary').click();await picker.locator('summary').click();await picker.getByRole('radio',{name:'Alimentation',exact:true}).click();
   assert.equal(await category.inputValue(),'alimentation');
   assert.equal(JSON.stringify(await f.read()),beforePicking,'Choosing an illustration must not commit a financial change');
   if(currency==='MAD'&&raw==='0,50')await f.page.screenshot({path:path.join(screenshots,'category-after-express-320-light.png'),fullPage:true});
   await form.locator('[name=amount]').fill(raw);await form.evaluate(node=>{node.requestSubmit();node.requestSubmit();});await f.page.locator('#dialog').waitFor({state:'hidden'});
   const saved=await f.read(),tx=saved.transactions.at(-1);assert.equal(saved.currency,currency);assert.equal(tx.amountCents,cents);assert.equal(tx.categoryId,'alimentation');assert.equal(tx.express.originalCurrency,currency);
  }
  const saved=await f.read();assert.equal(saved.transactions.length,count+entries.length,'Each Express save debits exactly once');assert.equal(saved.transactions.slice(count).reduce((sum,tx)=>sum+tx.amountCents,0),currency.startsWith('X')?2800:2850);
  assert.deepEqual(f.errors,[]);console.log(`PASS Express ${currency} ${width}px: illustrated choices preserve ${currency.startsWith('X')?'3/25':'0.50/3/25'}, exact cents, currency and single debits`);
 }finally{await f.context.close();}
}
async function verifyProgressiveFallback(browser,origin){
 for(const mode of ['script-disabled','stylesheet-unavailable']){
  const context=await browser.newContext({viewport:{width:320,height:844},javaScriptEnabled:mode!=='script-disabled',serviceWorkers:'block'}),page=await context.newPage();
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(mode==='stylesheet-unavailable'&&url.pathname.endsWith('/accounts/category-art.css'))return route.abort();return route.continue();});
  try{
   await page.goto(origin+'/__category-art-fixture');const native=page.getByLabel('Catégorie de dépense',{exact:true});assert(await native.isVisible(),'Native category selection remains usable when enhancement cannot load');
   await native.selectOption('transport');assert.equal(await native.inputValue(),'transport');assert.equal(await native.getAttribute('name'),'categoryId');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));console.log(`PASS progressive fallback ${mode}: labeled native category field remains usable`);
  }finally{await context.close();}
 }
}
(async()=>{
 fs.mkdirSync(screenshots,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{
  for(const [width,theme]of [[390,'light'],[320,'light'],[390,'dark']])await screenshotApp(browser,origin,width,theme);
  if(!baseline){for(const options of [{width:320,theme:'light'},{width:390,theme:'dark'},{width:390,theme:'light',failedAtlas:true}])await verifyPicker(browser,origin,options);await verifyProgressiveFallback(browser,origin);for(const currency of ['MAD','EUR','USD','GBP','CAD','CHF','XOF','XAF'])await verifyExpress(browser,origin,currency,currency==='MAD'?320:390);}
 }finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
