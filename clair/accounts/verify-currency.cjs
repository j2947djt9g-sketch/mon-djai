// Isolated signup and first-time budgets: intercepted HTTP, no real accounts or emails.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 try{for(const width of [320,390,768,1440])for(const code of ['EUR','USD','XOF','XAF']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const uid='8450886d-891a-40e2-995e-ea46bb1409bc',user={id:uid,aud:'authenticated',role:'authenticated',email:'currency-'+code.toLowerCase()+'@example.invalid',user_metadata:{display_name:'Test'},app_metadata:{provider:'email'},identities:[{id:uid,provider:'email'}]};
  const exp=1800000000,jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp,iss:'https://hkssnbvktfscizojhftl.supabase.co/auth/v1'},'TEST-SIGNATURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');let row=null,signups=0;
  await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{const request=route.request(),pathname=new URL(request.url()).pathname;let body={};
   if(pathname==='/auth/v1/signup'){signups++;assert.equal(request.postDataJSON().email,user.email);body={access_token:jwt,refresh_token:'TEST-REFRESH',expires_in:3600,expires_at:exp,token_type:'bearer',user};}
   else if(pathname==='/auth/v1/user')body=user;
   else if(pathname==='/rest/v1/clair_budgets')body=row;
   else if(pathname==='/rest/v1/rpc/save_clair_budget'){const p=request.postDataJSON();row={payload:p.p_payload,revision:(row?.revision||0)+1,operation_id:p.p_operation_id,display_name:p.p_display_name};body={saved:true,row};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('[data-action="account-mode"]').click();await page.locator('#account-form[data-mode="signup"]').waitFor();
  await page.locator('[name="displayName"]').fill('Test');await page.locator('[name="email"]').fill(user.email);await page.locator('[name="password"]').fill('Fictional-password-42!');await page.locator('#account-form button[type="submit"]').click();await page.locator('#wizard-form').waitFor();assert.equal(signups,1);
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
  const saved=await page.evaluate(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid)),uid);assert.equal(saved.currency,code);assert.equal(saved.openingCents,10000000);assert.equal(saved.rules.length,2);assert.equal(saved.rules[0].amounts[1],code.startsWith('X')?150000:350);assert.equal(saved.rules[1].amountCents,code.startsWith('X')?500000:999);assert.equal(saved.transactions.length,0);
  await page.waitForFunction(()=>document.querySelector('#account-status')?.textContent?.includes('Synchronis')||Object.keys(localStorage).some(k=>k.startsWith('clair-account-budget-v1-')&&JSON.parse(localStorage.getItem(k))._cloud?.dirty===false));assert.equal(row.payload.currency,code);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.reload();await page.locator('.balance-section').waitFor();assert.equal(await page.evaluate(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid)).currency,uid),code);assert.deepEqual(errors,[]);await context.close();console.log('PASS '+width+'px '+code+': simulated signup, setup, validation, drafts, exact rules, cloud sync, reload, no overflow');
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1;});
