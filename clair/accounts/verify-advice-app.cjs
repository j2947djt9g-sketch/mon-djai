/* Generated application with synthetic local data; no real account or network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const bridge=`window.__adviceApp={snapshot:()=>budgetSession.getSnapshot(),render,
 month:value=>{month=value;page='budget';render()},
 change:change=>commit(change,''),
 replace:value=>{budgetSession.adoptRemote(value,budgetSession.getContext());snapshot=saveData(value);localStorage.setItem(KEY,snapshot);render()},
 ack:()=>cloud.hooks.apply(E.normalize(data),JSON.stringify({...E.normalize(data),_cloud:{revision:200}}),budgetSession.getContext()),
 owner:id=>{cloud.enabled=true;cloud.client={auth:{}};cloud.user={id,email:id+'@example.test'};cloud.ready=true;cloud.status='synced';cloud.sync=async()=>{};cloud.epoch++;cloud.hooks.enter(cloud.user,{payload:budgetSession.getSnapshot()});render()}};`;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let bytes=fs.readFileSync(file);if(file.endsWith('/index.html'))bytes=Buffer.from(bytes.toString().replace('  render();if(!cloud.enabled)catchUp();',bridge+'  render();if(!cloud.enabled)catchUp();'));res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH||'/usr/bin/chromium'});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),errors=[],external=[];
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():(external.push(route.request().url()),route.abort()));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-16T12:00:00Z')});
 await page.addInitScript(()=>{
  window.CLAIR_ACCOUNT_CONFIG=null;localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');
  const tx=(id,amountCents,categoryId='alimentation',type='expense',date='2026-10-10')=>({id,amountCents,categoryId,type,date,name:id});
  const d={version:3,currency:'EUR',initialized:true,setupDone:true,openingCents:200000,openingBalanceDate:'2026-09-01',transactions:[3200,2800,1800,2400,3800,4500].map((v,i)=>tx('food-'+i,v)),rules:[],fixedExpenses:[],preferences:{reminders:false,theme:'light'},adviceSchema:1,advice:{transactions:{},months:{'2026-09':{through:'2026-09-30'},'2026-10':{through:'2026-10-31'}},goals:{},location:{country:'',city:''}}};
  d.transactions.push(tx('housing',46000,'logement'),tx('transport',700,'transport'),tx('other',12500,'autre'),tx('salary',105000,'income','income'),tx('save',10000,'epargne'),tx('withdraw',2000,'epargne','income'),tx('previous-food',14000,'alimentation','expense','2026-09-10'));
  localStorage.setItem('clair-github-money-v3',JSON.stringify(d));
 });
 await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();
 await page.evaluate(()=>{window.originalNav=document.querySelector('.bottom-nav');__adviceApp.month('2026-10')});
 assert.equal(await page.locator('.monthly-advice').count(),1,'real budget page must mount Compact controller');
 const totals=async()=>{for(const [key,value] of Object.entries({income:105000,expenses:77700,surplus:27300,savings:8000}))assert.equal(await page.locator('[data-advice-total="'+key+'"]').getAttribute('data-cents'),String(value));};
 await totals();const initial=await page.evaluate(()=>JSON.stringify(__adviceApp.snapshot().transactions));
 await page.locator('[data-advice-open-category="alimentation"]').first().click();await page.locator('[data-advice-exception="food-5"]').click();await totals();
 assert.equal(await page.evaluate(()=>JSON.stringify(__adviceApp.snapshot().transactions)),initial);
 assert.equal(await page.locator('[data-advice-goal] input').inputValue(),'140');
 await page.locator('[data-advice-goal] button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>__adviceApp.snapshot().budgetOverrides['2026-11'].alimentation),140);
 assert.equal(await page.evaluate(()=>JSON.stringify(__adviceApp.snapshot().transactions)),initial);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3')));assert.equal(saved.advice.goals['2026-11'].alimentation.amountCents,14000);
 await page.locator('[data-advice-goal] input').fill('155');await page.evaluate(()=>__adviceApp.ack());assert.equal(await page.locator('[data-advice-goal] input').inputValue(),'155');
 // A failed local save must preserve the input and the last committed goal.
 await page.evaluate(()=>{window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='clair-github-money-v3')throw new DOMException('Full','QuotaExceededError');return nativeSet.call(this,k,v)}});
 await page.locator('[data-advice-goal] button[type="submit"]').click();assert.equal(await page.locator('[data-advice-goal] input').inputValue(),'155');assert.equal(await page.evaluate(()=>__adviceApp.snapshot().budgetOverrides['2026-11'].alimentation),140);assert.match(await page.locator('[data-advice-error]').innerText(),/enregistr|sauvegard/i);
 await page.evaluate(()=>Storage.prototype.setItem=window.nativeSet);
 await page.locator('[data-action="month-prev"]').click();assert.match(await page.locator('.monthly-advice-heading').innerText(),/2026-09/);await page.locator('[data-action="month-next"]').click();await totals();
 await page.locator('.profile-button').click();await page.locator('[data-action="profile-edit"]').click();await page.locator('[name="adviceCountry"]').selectOption('FR');await page.locator('[name="adviceCity"]').fill('Angers');await page.locator('#profile-form button[type="submit"]').click();assert.equal(await page.evaluate(()=>__adviceApp.snapshot().advice.location.city),'Angers');
 await page.locator('[data-nav="budget"]').click();await page.evaluate(()=>__adviceApp.month('2026-10'));assert.equal(await page.locator('.monthly-advice a[target="_blank"]').count(),1);
 await page.clock.fastForward(6000);
 const out=process.env.CLAIR_ADVICE_SHOTS;if(out)fs.mkdirSync(out,{recursive:true});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+theme);if(out&&width===390)await page.screenshot({path:path.join(out,'conseils-'+theme+'-390.png'),fullPage:true})}}
 await page.setViewportSize({width:390,height:844});
 // Exercise the actual cloud-disabled FX dialog through ordinary app commit.
 await page.evaluate(()=>{
   const d=__adviceApp.snapshot();d.transactions.push({id:'linked-refund',type:'income',amountCents:1000,date:'2026-10-25',categoryId:'income',name:'Remboursement fictif'});
   d.advice.transactions['linked-refund']={nature:'refund',refundOf:'food-5'};
   d.advice.months['2026-10']={through:'2026-10-31'};
   __adviceApp.replace(d);window.expectedLocalFX=ClairEngine.convertCurrency(d,'USD','2026-11-16');
 });
 await page.locator('.bottom-nav [data-nav="settings"]').click();await page.locator('[data-action="currency-change"]').click();
 await page.locator('#currency-target').selectOption('USD');await page.locator('[data-action="currency-preview"]').click();await page.locator('[data-action="currency-apply"]').click();await page.locator('#dialog').waitFor({state:'hidden'});
 const converted=await page.evaluate(()=>__adviceApp.snapshot());assert.equal(converted.currency,'USD');assert.equal(converted.advice.transactions['linked-refund'].refundOf,'food-5','local conversion must retain valid refund linkage');assert.equal(converted.advice.months['2026-10'].through,'2026-10-31','pure FX must retain reviewed calendar coverage');assert.deepEqual(converted,await page.evaluate(()=>expectedLocalFX));
 await page.evaluate(()=>__adviceApp.month('2026-10'));
 await page.setViewportSize({width:390,height:844});await page.locator('[data-advice-open-category="alimentation"]').first().click();await page.locator('[data-advice-goal] input').fill('199');await page.evaluate(()=>__adviceApp.owner('synthetic-b'));assert.equal(await page.locator('[data-advice-category-detail]').count(),0);
 assert(await page.evaluate(()=>originalNav===document.querySelector('.bottom-nav')));
 for(let i=0;i<8;i++){await page.evaluate(()=>__adviceApp.month('2026-10'));await page.locator('.bottom-nav [data-nav="home"]').click()}
 assert(await page.evaluate(()=>originalNav===document.querySelector('.bottom-nav')));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS generated app: exact totals/context/goals/local storage failure/ACK/month/profile/resources/responsive/owner/persistent navigation');await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
