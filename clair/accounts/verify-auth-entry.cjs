// Real SDK and browser; every Auth request is intercepted. No real accounts or emails.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base='https://hkssnbvktfscizojhftl.supabase.co';
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  const calls={signup:0,login:0};let loginError='email_not_confirmed',signupLimited=true;
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});
  await context.route(base+'/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/auth/v1/signup'){
    calls.signup++;
    return route.fulfill({headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},status:signupLimited?429:200,contentType:'application/json',body:JSON.stringify(signupLimited?{code:'over_email_send_rate_limit',message:'Email rate limit exceeded'}:{id:'8450886d-891a-40e2-995e-ea46bb1409bc',aud:'authenticated',role:'authenticated',email:'new@example.invalid',identities:[{id:'new'}]})});
   }
   if(url.pathname==='/auth/v1/token'){
    calls.login++;assert.equal(url.searchParams.get('grant_type'),'password');
    return route.fulfill({headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},status:loginError==='over_request_rate_limit'?429:400,contentType:'application/json',body:JSON.stringify({code:loginError,message:loginError})});
   }
   return route.fulfill({headers:{'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},status:200,contentType:'application/json',body:'{}'});
  });
  const open=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.keyboard.press('Escape');await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#account-form').waitFor();};
  const email=()=>page.locator('#account-form input[name="email"]'),password=()=>page.locator('#account-form input[name="password"]'),submit=()=>page.locator('#account-form button[type="submit"]'),error=()=>page.locator('#account-error');
  const waitText=async text=>{try{await page.waitForFunction(text=>document.querySelector('#account-error')?.textContent.includes(text),text);}catch(error){console.error(JSON.stringify({expected:text,actual:await page.locator('#account-error').innerText(),calls,pageErrors:errors}));throw error;}};
  await open();await page.locator('[data-action="account-mode"]').click();
  assert.match(await page.locator('#account-form').innerText(),/mail de confirmation/);
  await page.locator('[name="displayName"]').fill('Test');await email().fill('new@example.invalid');await password().fill('fictional password phrase');
  await submit().click();await waitText('service e-mail');assert(await submit().isEnabled());assert.equal(await page.locator('#account-confirmation-title').count(),0,'A rejected send must not show success');
  signupLimited=false;await submit().click();await page.locator('#account-confirmation-title').waitFor();
  assert.match(await page.locator('.signup-confirmation-steps').innerText(),/Clique sur le lien/);assert.match(await page.locator('#page').innerText(),/indésirables/);assert.equal(await page.locator('#account-form').count(),0);assert.equal(calls.signup,2);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'account-confirmation-title');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('[data-action="account-login"]').click();await email().fill('new@example.invalid');await password().fill('incorrect password phrase');
  await submit().click();await waitText('pas encore confirmée');assert.match(await error().innerText(),/clique sur le lien/);assert(await submit().isEnabled());
  loginError='over_request_rate_limit';await submit().click();await waitText('Trop de tentatives');assert(await submit().isEnabled());
  const callsBefore=calls.login;await context.setOffline(true);await submit().click();await waitText('connexion Internet');assert.equal(calls.login,callsBefore);await context.setOffline(false);
  loginError='invalid_credentials';
  for(const message of ['2 essais','1 essai','une heure']){await submit().click();await waitText(message);}
  assert.equal(calls.login,callsBefore+3);assert(await submit().isDisabled());assert(await page.locator('[data-action="account-forgot"]').isEnabled());
  await email().fill('other@example.invalid');assert(await submit().isEnabled());await submit().click();await waitText('2 essais');assert(await submit().isEnabled());
  await email().fill('new@example.invalid');const beforeLocked=calls.login;await submit().click();await waitText('une heure');assert.equal(calls.login,beforeLocked);assert(await submit().isDisabled());
  await page.locator('[data-action="account-forgot"]').click();await page.locator('#account-forgot-form').waitFor();assert(await page.locator('#recovery-admin-contact').isVisible());
  await page.locator('[data-action="account-reset-back"]').click();
  await open();await email().fill('new@example.invalid');await password().fill('incorrect password phrase');await submit().click();await waitText('une heure');assert.equal(calls.login,beforeLocked,'Reload must preserve the pause');
  await page.clock.fastForward(3601000);await page.waitForFunction(()=>!document.querySelector('#account-form button[type="submit"]').disabled);
  assert.doesNotMatch(await error().innerText(),/une heure/,'Expiry must clear stale lock wording');
  await submit().click();await waitText('2 essais');assert.equal(calls.login,beforeLocked+1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await context.close();console.log('PASS auth entry '+width+'px: explicit confirmation, honest delivery error, non-credential exclusions, two retries, third-error pause, recovery, reload, address isolation and hour expiry');
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});