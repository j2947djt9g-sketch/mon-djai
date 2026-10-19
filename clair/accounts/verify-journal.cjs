// Fictional fixtures only; no Supabase sessions or external API requests.
(function verifyJournal(){
 const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
 const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
 const move=(id,type,amountCents,name,extra={})=>({id,type,amountCents,name,date:'2026-10-18',categoryId:'autre',note:'',...extra});
 const seed={version:3,initialized:true,setupDone:true,openingCents:30000,openingBalanceDate:'2026-10-01',transactions:[move('salary','income',24000,'Salaire démo'),move('transport','expense',2200,'Transport démo',{categoryId:'transport',autoKey:'demo:2026-10-18'}),move('phone','expense',1000,'Forfait démo',{categoryId:'telephone'}),move('deposit','expense',3000,'Voyage démo',{categoryId:'epargne',savingsProjectId:'trip'}),move('withdraw','income',500,'Retrait démo',{categoryId:'epargne',savingsProjectId:'trip',date:'2026-10-19'})],savingsSchema:1,savingsProjects:[{id:'trip',name:'Voyage démo',kind:'voyage',icon:'plane',color:'violet',targetCents:60000,targetDate:null,archived:false}],rules:[],skipped:[],budgets:{},budgetOverrides:{},customCategories:[],savingsGoal:0,fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}};
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
  try{
   // Render the vector source without a font dependency; emitted bytes are reviewable build outputs.
   if(process.env.CLAIR_RENDER_ICONS==='1'){
    const page=await browser.newPage(),svg=fs.readFileSync(path.join(root,'icons/icon.svg'),'utf8');
    for(const size of [180,192,512]){
     await page.setViewportSize({width:size,height:size});await page.setContent('<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>'+svg);
     console.log('CLAIR_ICON_'+size+'='+((await page.screenshot({type:'png',omitBackground:true})).toString('base64')));
    }
    await page.setViewportSize({width:512,height:512});await page.setContent('<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>'+svg.replace('rx="112"','rx="0"'));
    const png=await page.screenshot({type:'png',omitBackground:true});fs.writeFileSync(path.join(root,'icons/icon-maskable-512.png'),png);console.log('CLAIR_ICON_MASKABLE='+png.toString('base64'));await page.close();
   }
   for(const width of [1440,390,320,768]){
    const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},colorScheme:'light'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-19T12:00:00Z')});
    await page.addInitScript(seed=>{window.CLAIR_ACCOUNT_CONFIG=null;localStorage.setItem('clair-github-money-v3',JSON.stringify(seed));sessionStorage.setItem('clair-welcome-v1','1');},seed);
    await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();
    const nav=width<=720?'.bottom-nav':'.nav';await page.locator(nav+' [data-nav="journal"]').click();
    const rows=page.locator('#journal-results .row'),flow=kind=>page.locator('[data-action="journal-flow"][data-flow="'+kind+'"]');
    assert.equal(await rows.count(),5);assert.equal(await flow('all').getAttribute('aria-pressed'),'true');assert.equal(await rows.locator('[data-action="edit-tx"]').count(),5);
    assert.equal(await page.locator('#journal-results [data-cashflow="income"] .row-amount').first().evaluate(e=>getComputedStyle(e).color),'rgb(21, 128, 61)');
    assert.equal(await page.locator('#journal-results [data-cashflow="expense"] .row-amount').first().evaluate(e=>getComputedStyle(e).color),'rgb(37, 99, 235)');
    const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.journal-segments button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height}})}));assert(geometry.scroll<=width+1,'overflow '+width);assert(geometry.controls.every(r=>r.left>=0&&r.right<=width+1&&r.height>=44),'tabs clipped or too small');
    if(process.env.CLAIR_PREVIEW==='1'&&[1440,390].includes(width))console.log('CLAIR_JOURNAL_PREVIEW_'+width+'='+((await page.screenshot({type:'jpeg',quality:60})).toString('base64')));
    await flow('income').click();assert.equal(await rows.count(),1);assert.match(await rows.innerText(),/Salaire démo/);
    await flow('expense').focus();await page.keyboard.press('Enter');assert.equal(await rows.count(),2);assert.equal(await page.locator('#journal-results [data-savings="true"]').count(),0);
    await page.locator('#search').fill('Forfait');assert.equal(await rows.count(),1);await page.locator('[data-action="month-prev"]').click();assert.equal(await rows.count(),0);assert.equal(await page.locator('#search').inputValue(),'Forfait');assert.equal(await flow('expense').getAttribute('aria-pressed'),'true');await page.locator('[data-action="month-next"]').click();assert.equal(await rows.count(),1);
    await page.locator('#search').fill('');await page.locator('#journal-more summary').click();await page.locator('#kind-filter').selectOption('auto');assert.equal(await rows.count(),1);assert.match(await rows.innerText(),/Transport démo/);
    await flow('all').click();await page.locator('#kind-filter').selectOption('savings');assert.equal(await rows.count(),2);await page.locator('#search').fill('Voyage');assert.equal(await rows.count(),2);await page.locator('#search').fill('');
    await page.locator(nav+' [data-nav="home"]').click();await page.locator(nav+' [data-nav="journal"]').click();assert.equal(await page.locator('#kind-filter').inputValue(),'savings');assert.equal(await rows.count(),2);
    await page.locator('#kind-filter').selectOption('all');await page.locator('#journal-more summary').click();
    await page.locator('.journal-options [data-action="add"]').click();assert.equal(await page.locator('#dialog [data-action="income"]').count(),1);assert.equal(await page.locator('#dialog [data-action="expense"]').count(),1);await page.locator('#dialog [data-action="close"]').first().click();
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark'});assert.equal(await page.locator('#journal-results [data-cashflow="income"] .row-amount').first().evaluate(e=>getComputedStyle(e).color),'rgb(120, 221, 160)');assert.equal(await page.locator('#journal-results [data-cashflow="expense"] .row-amount').first().evaluate(e=>getComputedStyle(e).color),'rgb(140, 181, 255)');
    if(process.env.CLAIR_PREVIEW==='1'&&width===390)console.log('CLAIR_JOURNAL_DARK_PREVIEW='+((await page.screenshot({type:'jpeg',quality:60})).toString('base64')));
    await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>{document.documentElement.dataset.theme='auto'});assert.equal(await page.locator('#journal-results [data-cashflow="expense"] .row-amount').first().evaluate(e=>getComputedStyle(e).color),'rgb(140, 181, 255)');
    const logo=page.locator(width<=720?'.mobile-brand .brand-mark svg':'.sidebar .brand-mark svg');assert(await logo.isVisible());assert.equal(await logo.locator('text').count(),0);
    const iconResult=await page.evaluate(async()=>{const manifest=await(await fetch('manifest.webmanifest')).json(),svg=await(await fetch('icons/icon.svg')).text(),png=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve({width:i.naturalWidth,height:i.naturalHeight});i.onerror=reject;i.src='icons/icon-maskable-512.png'});return {manifest,svg,png,ids:[...document.querySelectorAll('[id]')].map(e=>e.id)}});assert.equal(iconResult.manifest.theme_color,'#783bf1');assert(iconResult.manifest.icons.some(i=>i.purpose==='maskable'));assert.equal(iconResult.png.width,512);assert(!iconResult.svg.includes('<text'));assert.equal(new Set(iconResult.ids).size,iconResult.ids.length,'duplicate inline SVG IDs');assert.deepEqual(errors,[]);
    console.log('PASS journal Chromium '+width+'px: combined filters, savings separation, editable rows, add choices, persistent search/month/source, keyboard, blue/green light/dark/auto, Ruban icons and no overflow');await context.close();
   }
  }finally{await browser.close();}
 }
 main().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1});
})();
