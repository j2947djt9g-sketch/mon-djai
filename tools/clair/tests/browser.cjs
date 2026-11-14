// Local packaged bytes only; fictional budgets, no accounts or external requests.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(root,'clair-package-manifest.json')))throw Error('Usage: browser.cjs /absolute/verified/package');
const seed={version:3,currency:'EUR',initialized:true,setupDone:true,openingCents:10000,openingBalanceDate:'2026-11-13',transactions:[{id:'fixture-expense',type:'expense',amountCents:321,date:'2026-11-13',name:'Fixture',categoryId:'alimentation'}],rules:[],skipped:[],budgets:{},budgetOverrides:{},customCategories:[],savingsGoal:0,fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
async function init(context,external){
 await context.addInitScript(seed=>{window.CLAIR_ACCOUNT_CONFIG=null;window.MASTERBOARD_CONFIG=null;try{if(!localStorage.getItem('clair-github-money-v3'))localStorage.setItem('clair-github-money-v3',JSON.stringify(seed));sessionStorage.setItem('clair-splash-v2','1');}catch{}},seed);
 context.on('request',req=>{const url=new URL(req.url());if(['http:','https:','ws:','wss:'].includes(url.protocol)&&url.hostname!=='127.0.0.1')external.push(req.url());});
 await context.route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.hostname!=='127.0.0.1'?route.abort():route.continue();});
}
async function ready(page){await page.locator('.balance-section').waitFor();assert.match(await page.locator('.balance').innerText(),/96,79/);}
async function controlled(page){await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:15000});await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});assert(await page.evaluate(()=>!!navigator.serviceWorker.controller));}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,temp=fs.mkdtempSync(path.join(os.tmpdir(),'clair-download-'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH||'/usr/bin/chromium'}),external=[],errors=[];
 try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});await init(context,external);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/clair/');await ready(page);console.log('STAGE Clair ready');await controlled(page);console.log('STAGE Clair controlled');
  await page.locator('.bottom-nav [data-nav="settings"]').click();
  const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="download-app"]').click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'Clair.html');const downloaded=path.join(temp,'Clair.html');await download.saveAs(downloaded);console.log('STAGE download saved');
  const html=fs.readFileSync(downloaded,'utf8');assert.match(html,/root.ClairEngine =/);assert.doesNotMatch(html,/<link rel="(?:manifest|icon|apple-touch-icon)"/);assert.match(html,/data:image\/(?:png|webp);base64,/);
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(scripts.length,5);for(const script of scripts)new Function(script);assert.equal(scripts[1].trim(),fs.readFileSync(path.join(root,'masterboard/supabase-2.102.0.js'),'utf8').trim());assert(!html.includes('fixture-expense'));assert.doesNotMatch(html,/url\('assets\/mascotte\//);console.log('PASS downloaded artifact inspection: five parsable scripts, exact shared SDK, embedded mascots, no fixture ledger or installation links');
  if(process.env.CLAIR_SKIP_FILE_POLICY!=='1'){
  const local=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});await init(local,external);const file=await local.newPage(),fileFailures=[];file.on('pageerror',e=>errors.push(e.message));file.on('requestfailed',r=>fileFailures.push(r.url()));await file.goto(pathToFileURL(downloaded).href);await ready(file);console.log('STAGE file ready');
  assert.deepEqual(await file.evaluate(()=>({version:JSON.parse(localStorage.getItem('clair-github-money-v3')).version,balance:ClairEngine.balance(JSON.parse(localStorage.getItem('clair-github-money-v3'))),config:window.CLAIR_ACCOUNT_CONFIG,scripts:document.scripts.length})),{version:3,balance:9679,config:null,scripts:5});
  assert.equal(await file.evaluate(()=>document.scripts[1].textContent.trim()),fs.readFileSync(path.join(root,'masterboard/supabase-2.102.0.js'),'utf8').trim());
  await file.locator('.bottom-nav [data-nav="settings"]').click();const exportEvent=file.waitForEvent('download');await file.locator('[data-action="export"]').click();const jsonDownload=await exportEvent;const jsonFile=path.join(temp,'budget.json');await jsonDownload.saveAs(jsonFile);const data=JSON.parse(fs.readFileSync(jsonFile));assert.equal(data.version,3);assert.equal(data.openingCents,10000);assert.equal(data.transactions[0].amountCents,321);
  assert(fileFailures.every(u=>u.startsWith('file:')&&u.endsWith('/assets/categories/atlas-v1.webp')),'Only the documented relative atlas fallback may fail: '+JSON.stringify(fileFailures));
  await local.close();
  }else console.log('LIMIT: file:// proof skipped explicitly because managed Chromium URL policy blocks it');
  const keys=await page.evaluate(async()=>{const names=await caches.keys();const rows=[];for(const name of names){for(const req of await (await caches.open(name)).keys())rows.push(new URL(req.url).pathname);}return rows;});assert(keys.includes('/clair/index.html'));assert(keys.every(p=>p.startsWith('/clair/')&&!/accounts|auth|rest|functions/.test(p)));
  await context.setOffline(true);await page.reload();await ready(page);assert(await page.evaluate(()=>!!navigator.serviceWorker.controller));await context.setOffline(false);
  console.log('PASS Chromium: actual downloaded HTML; file:// only if not explicitly skipped; Clair controlling SW offline reload and scoped cache');
  await context.close();
  const master=await browser.newContext();await init(master,external);const mb=await master.newPage();mb.on('pageerror',e=>errors.push(e.message));await mb.goto(origin+'/masterboard/');await controlled(mb);await master.setOffline(true);await mb.reload();const offline=fs.readFileSync(path.join(root,'masterboard/offline.html'),'utf8');assert.match(await mb.locator('h1').innerText(),/Une connexion pour continuer/);assert.equal(await mb.evaluate(()=>document.documentElement.outerHTML),await mb.evaluate(source=>new DOMParser().parseFromString(source,'text/html').documentElement.outerHTML,offline));
  const masterCaches=await mb.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith('clair-masterboard'));return Promise.all(names.map(async n=>(await (await caches.open(n)).keys()).map(r=>new URL(r.url).pathname)));});assert.deepEqual(masterCaches,[['/masterboard/offline.html']]);await master.close();
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);console.log('PASS Chromium: Masterboard controlling SW offline fallback only; no external network attempts or page errors');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
