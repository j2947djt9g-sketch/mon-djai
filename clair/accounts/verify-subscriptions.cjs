// Fictional local data; no real account, notification or payment is touched.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const rule=(id,name,day,amountCents)=>({id,name,categoryId:'abonnements',kind:'monthly',start:'2026-10-01',end:null,day,month:1,amountCents,amounts:[],pauses:[],reminderEnabled:true});
const seed={version:3,initialized:true,setupDone:true,openingCents:10000,openingBalanceDate:'2026-10-01',transactions:[],rules:[rule('phone','Forfait',23,1000),rule('transport','Transport',27,2200)],skipped:[],budgets:{},budgetOverrides:{},customCategories:[],savingsGoal:0,savingsSchema:1,savingsProjects:[],fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:true}};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const content=fs.readFileSync(file);res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/index.html';
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-21T12:00:00+02:00')});
   await page.addInitScript(seed=>{window.CLAIR_ACCOUNT_CONFIG=null;if(!localStorage.getItem('clair-github-money-v3'))localStorage.setItem('clair-github-money-v3',JSON.stringify(seed));sessionStorage.setItem('clair-splash-v2','1');},seed);
   await page.goto(url);await page.clock.runFor(500);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('.balance-section').waitFor();
   assert.match(await page.locator('#reminders').innerText(),/Forfait.*dans 2 jours/);
   assert.match(await page.locator('.balance').innerText(),/100,00/);
   await page.clock.setSystemTime(new Date('2026-10-23T00:00:00+02:00'));await page.clock.fastForward(31000);
   assert.match(await page.locator('.balance').innerText(),/90,00/);
   assert.deepEqual(await page.locator('.home-payment').evaluateAll(nodes=>nodes.map(n=>n.dataset.key)),['transport:2026-10-27','phone:2026-11-23']);
   assert(!await page.locator('#reminders').innerText());
   let data=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3')));assert.equal(data.transactions.length,1);assert.equal(data.transactions[0].autoKey,'phone:2026-10-23');assert.equal(data.transactions[0].paymentConfirmed,false);
   await page.reload();await page.locator('.balance-section').waitFor();assert.match(await page.locator('.balance').innerText(),/90,00/);
   await page.clock.setSystemTime(new Date('2026-11-23T00:00:00+01:00'));await page.clock.fastForward(31000);
   assert.match(await page.locator('.balance').innerText(),/58,00/);data=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3')));assert.equal(data.transactions.length,3);
   assert.deepEqual(await page.locator('.home-payment').evaluateAll(nodes=>nodes.map(n=>n.dataset.key)),['transport:2026-11-27','phone:2026-12-23']);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
   console.log('PASS '+width+'px: J-2 banner, midnight debit, removal, next-month ordering, persisted history and catch-up without duplicates');await context.close();
  }
 }finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1});
