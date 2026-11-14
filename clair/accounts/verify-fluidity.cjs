const {chooseCategory}=require('./browser-category-picker.cjs');
// Real DOM and keyboard checks against fictional local data. All nonlocal requests are blocked.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
function fixture(currency){
 return {version:3,currency,initialized:true,setupDone:true,openingCents:1000000,openingBalanceDate:'2026-10-01',transactions:[{id:'deposit',type:'expense',amountCents:3000,date:'2026-10-15',name:'Voyage déposé',categoryId:'epargne',savingsProjectId:'trip',note:''},{id:'withdraw',type:'income',amountCents:500,date:'2026-10-16',name:'Voyage retiré',categoryId:'epargne',savingsProjectId:'trip',note:''},{id:'phone',type:'expense',amountCents:1000,date:'2026-10-15',name:'Forfait',categoryId:'telephone',note:''}],savingsSchema:1,savingsProjects:[{id:'trip',name:'Voyage',kind:'voyage',icon:'plane',color:'violet',targetCents:100000,targetDate:null,archived:false}],rules:[],skipped:[],budgets:{},budgetOverrides:{},customCategories:[{id:'custom-study',label:'Bourse étudiante',icon:'·'}],savingsGoal:0,fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}};
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{
  for(const [width,currency]of [[320,'EUR'],[390,'EUR'],[768,'EUR'],[1440,'EUR'],[390,'USD'],[390,'XOF'],[390,'XAF']]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.clock.install({time:new Date('2026-10-19T12:00:00Z')});
   await page.addInitScript(seed=>{window.CLAIR_ACCOUNT_CONFIG=null;localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');if(!localStorage.getItem('clair-github-money-v3'))localStorage.setItem('clair-github-money-v3',JSON.stringify(seed));},fixture(currency));
   await page.goto(origin+'/index.html');await page.clock.runFor(500);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('.balance-section').waitFor();
   const readData=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3'))),form=page.locator('#tx-form'),field=name=>form.locator('[name="'+name+'"]'),add=()=>page.locator('[data-action="add"]:visible').first().click();
   await add();await form.waitFor();
   const group=form.locator('[role="group"]:has([data-action="expense"])');assert.equal(await group.count(),1,'New transaction type choices belong to an accessible group');
   const expense=()=>form.getByRole('button',{name:'Dépense',exact:true}),income=()=>form.getByRole('button',{name:'Argent reçu',exact:true});
   assert.equal(await expense().getAttribute('aria-pressed'),'true');assert.equal(await income().getAttribute('aria-pressed'),'false');assert.equal(await expense().getAttribute('type'),'button');assert.equal(await income().getAttribute('type'),'button');
   assert.equal(await field('amount').getAttribute('inputmode'),currency.startsWith('X')?'numeric':'decimal');assert.match(await field('amount').locator('..').innerText(),currency==='EUR'?/€/ :currency==='USD'?/\$US/:/F CFA/);
   const draft={amount:currency.startsWith('X')?'1500':'9,',date:'2026-10-18',name:'Bourse <essai>',categoryId:'custom-study',note:'Parents & études'};
   for(const [name,value]of Object.entries(draft)){if(name==='categoryId')await chooseCategory(page,field(name),value);else await field(name).fill(value);}
   const assertDraft=async category=>{for(const [name,value]of Object.entries({...draft,categoryId:category}))assert.equal(await field(name).inputValue(),value,'Switching type must preserve '+name);};
   await income().focus();await page.keyboard.press('Enter');await assertDraft('custom-study');assert.equal(await income().getAttribute('aria-pressed'),'true');assert.equal(await expense().getAttribute('aria-pressed'),'false');
   await expense().focus();await page.keyboard.press('Space');await assertDraft('custom-study');assert.equal(await expense().getAttribute('aria-pressed'),'true');
   await income().click();await chooseCategory(page,field('categoryId'),'income');await expense().click();await assertDraft('alimentation');
   assert.equal((await readData()).transactions.length,3,'Choosing a type must never save a transaction');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'New transaction controls overflow at '+width);
   await field('amount').fill('0');await form.locator('button[type="submit"]').click();assert((await page.locator('#form-error').innerText()).trim());assert.equal((await readData()).transactions.length,3);
   await income().click();await field('amount').fill(currency.startsWith('X')?'1500':'12,50');await chooseCategory(page,field('categoryId'),'custom-study');await form.locator('button[type="submit"]').click();await page.locator('#dialog').waitFor({state:'hidden'});
   let saved=await readData(),entry=saved.transactions.find(t=>t.name===draft.name);assert.equal(entry.type,'income');assert.equal(entry.categoryId,'custom-study');assert.equal(entry.amountCents,currency.startsWith('X')?150000:1250);assert.equal(entry.note,draft.note);assert.equal(entry.date,draft.date);assert.equal(saved.currency,currency);
   await add();await field('amount').fill(currency.startsWith('X')?'1500':'12,50');await field('name').fill('Courses fictives');await form.locator('button[type="submit"]').click();await page.locator('#dialog').waitFor({state:'hidden'});saved=await readData();assert.equal(saved.transactions.find(t=>t.name==='Courses fictives').type,'expense');
   await page.locator('[data-nav="journal"]:visible').first().click();const rows=page.locator('#journal-results .row');
   await page.locator('[data-action="edit-tx"][data-id="'+entry.id+'"]').click();assert.equal(await form.locator('[data-action="income"],[data-action="expense"]').count(),0,'Existing entries must not gain a type selector');await page.locator('#dialog [data-action="close"]').first().click();
   assert.match(await rows.filter({hasText:draft.name}).innerText(),/\+/);assert.match(await rows.filter({hasText:'Courses fictives'}).innerText(),/−/);
   const category=page.locator('#category-filter'),kind=page.locator('#kind-filter'),search=page.locator('#search'),flow=value=>page.locator('[data-action="journal-flow"][data-flow="'+value+'"]');
   if(!await kind.isVisible())await page.locator('#journal-more summary').click();const beforeFilters=JSON.stringify(await readData());
   for(const direction of ['income','expense'])for(const [source,categoryId,count]of [['savings','all',2],['all','epargne',2],['manual','epargne',2],['auto','epargne',0],['savings','telephone',0]]){
    await flow('all').click();await chooseCategory(page,category,categoryId);await kind.selectOption(source);await search.fill('Voyage');await flow(direction).click();assert.equal(await rows.count(),0);
    const recovery=page.locator('#journal-companion [data-action="journal-show-savings"]');assert.equal(await recovery.count(),1);assert.match(await recovery.innerText(),/Afficher l[’']épargne dans Tout/);assert.match(await page.locator('#journal-companion').innerText(),/revenu|achat|dépens|transfert/i);
    const month=await page.locator('.month-nav span').innerText();await recovery.focus();await page.keyboard.press('Enter');
    assert.equal(await flow('all').getAttribute('aria-pressed'),'true');assert.equal(await category.inputValue(),categoryId);assert.equal(await kind.inputValue(),source);assert.equal(await search.inputValue(),'Voyage');assert.equal(await page.locator('.month-nav span').innerText(),month);assert.equal(await page.locator('#journal-more').evaluate(el=>el.open),true);assert.equal(await recovery.count(),0);assert.equal(await rows.count(),count);
    assert.equal(JSON.stringify(await readData()),beforeFilters,'Recovery must never change the budget');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Savings guidance overflows at '+width);
   }
   await chooseCategory(page,category,'epargne');await kind.selectOption('savings');await page.locator('[data-action="month-prev"]').click();await flow('income').click();const previousMonth=await page.locator('.month-nav span').innerText();await page.locator('[data-action="journal-show-savings"]').click();assert.equal(await page.locator('.month-nav span').innerText(),previousMonth);assert.equal(await rows.count(),0);assert.equal(await search.inputValue(),'Voyage');await page.locator('[data-action="month-next"]').click();assert.equal(await rows.count(),2);
   await chooseCategory(page,category,'telephone');await kind.selectOption('all');await search.fill('introuvable');await flow('expense').click();assert.equal(await page.locator('[data-action="journal-show-savings"]').count(),0,'Unrelated empty results must retain ordinary guidance');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS fluidity '+width+'px '+currency+': direct expense, keyboard type choice, raw drafts, categories, signed saves, corrections, targeted savings recovery and unchanged ledger');
  }
 }finally{await browser.close();}
}
main().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
