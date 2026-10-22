// Isolated first-time budgets: no real accounts, email or backend writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 try{for(const width of [320,390,768,1440])for(const code of ['EUR','USD','XOF','XAF']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.CLAIR_ACCOUNT_CONFIG=null;sessionStorage.setItem('clair-splash-v2','1');});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.locator('#wizard-form').waitFor();
  assert.equal(await page.locator('#setup-currency option').count(),4);await page.locator('[name="balance"]').fill('99');await page.locator('#setup-currency').selectOption(code);
  if(code!=='EUR')assert.equal(await page.locator('[name="balance"]').inputValue(),'');
  if(code.startsWith('X')){await page.locator('[name="balance"]').fill('100,50');await page.locator('#wizard-form button[type="submit"]').click();assert(await page.locator('#setup-currency').isVisible());assert.match(await page.locator('#form-error').innerText(),/entier/);}
  await page.locator('[name="balance"]').fill('100000');await page.locator('#wizard-form button[type="submit"]').click();await page.locator('[name="meals"]').check();
  for(let day=0;day<7;day++)await page.locator('[name="day-'+day+'"]').uncheck();
  await page.locator('[name="day-1"]').check();await page.locator('[name="price-1"]').fill(code.startsWith('X')?'1500':'3,50');
  await page.locator('[data-action="wizard-back"]').click();assert.equal(await page.locator('#setup-currency').inputValue(),code);assert.equal(await page.locator('[name="balance"]').inputValue(),code.startsWith('X')?'100000':'100000,00');
  await page.locator('#wizard-form button[type="submit"]').click();assert.equal(await page.locator('[name="price-1"]').inputValue(),code.startsWith('X')?'1500':'3,50');
  await page.locator('#wizard-form button[type="submit"]').click();await page.locator('[data-action="wizard-add-charge"]').click();await page.locator('[name="charge-on-0"]').check();await page.locator('[name="charge-name-0"]').fill('Abonnement test');await page.locator('[name="charge-amount-0"]').fill(code.startsWith('X')?'5000':'9,99');
  await page.locator('#wizard-form button[type="submit"]').click();assert.match(await page.locator('#wizard-form').innerText(),new RegExp(code==='EUR'?'Euro':code==='USD'?'Dollar':code));await page.getByRole('button',{name:'Activer mon suivi',exact:true}).click();await page.locator('.balance-section').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3')));assert.equal(saved.currency,code);assert.equal(saved.openingCents,10000000);assert.equal(saved.rules.length,2);assert.equal(saved.rules[0].amounts[1],code.startsWith('X')?150000:350);assert.equal(saved.rules[1].amountCents,code.startsWith('X')?500000:999);assert.equal(saved.transactions.length,0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.reload();await page.locator('.balance-section').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-github-money-v3')).currency),code);assert.deepEqual(errors,[]);await context.close();console.log('PASS '+width+'px '+code+': setup, validation, drafts, automatic rules, exact amounts, reload, no overflow');
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1;});
