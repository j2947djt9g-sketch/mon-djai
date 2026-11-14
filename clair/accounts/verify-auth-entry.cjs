// Official embedded SDK 2.102.0 and Chromium; all external traffic is intercepted.
// Fictional accounts only: transport mocks do not prove SMTP delivery.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base='https://hkssnbvktfscizojhftl.supabase.co';
const redirect='https://clair-budget.vercel.app/clair/?auth=confirmation',captures=process.env.CLAIR_AUTH_CAPTURE_DIR;
if(captures)fs.mkdirSync(captures,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
  const errors=[],unexpected=[],calls={signup:0,login:0,resend:0};
  let loginError='email_not_confirmed',signupLimited=true,resendResult='success',resendGate=null,releaseResend=null,resendReached=null;
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});
  // Fail closed, including if Auth accidentally targets another external host.
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin==='http://127.0.0.1:'+server.address().port)return route.continue();
   if(url.origin!==base){unexpected.push(req.method()+' '+url.origin+url.pathname);return route.abort('blockedbyclient');}
   assert.match(req.headers()['x-client-info']||'',/^supabase-js-web\/2\.102\.0$/,'Exercise the official embedded SDK');
   const headers={'X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'};
   const reply=(status,body)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='POST'&&url.pathname==='/auth/v1/signup'){
    calls.signup++;const body=req.postDataJSON();
    assert.equal(url.searchParams.get('redirect_to'),redirect);assert.equal(body.email,'new@example.invalid');assert.equal(body.data.display_name,'Test');
    // An obfuscated response is neutral acceptance, never proof of delivery.
    return reply(signupLimited?429:200,signupLimited?{code:'over_email_send_rate_limit',message:'provider detail must stay private'}:{id:'8450886d-891a-40e2-995e-ea46bb1409bc',aud:'authenticated',role:'authenticated',email:body.email,identities:[]});
   }
   if(req.method()==='POST'&&url.pathname==='/auth/v1/resend'){
    calls.resend++;const body=req.postDataJSON();
    assert.equal(body.type,'signup');assert.equal(url.searchParams.get('redirect_to'),redirect);
    assert.match(body.email,/^(new|unconfirmed|callback)@example\.invalid$/);assert.equal(body.password,undefined);
    resendReached?.();if(resendGate)await resendGate;
    if(resendResult==='network')return route.abort('failed');
    return reply(resendResult==='limited'?429:200,resendResult==='limited'?{code:'over_email_send_rate_limit',message:'provider detail must stay private'}:{});
   }
   if(req.method()==='POST'&&url.pathname==='/auth/v1/token'){
    calls.login++;assert.equal(url.searchParams.get('grant_type'),'password');
    return reply(loginError==='over_request_rate_limit'?429:400,{code:loginError,message:loginError});
   }
   unexpected.push(req.method()+' '+url.origin+url.pathname);return route.abort('blockedbyclient');
  });
  const capture=async name=>{if(captures)await page.screenshot({path:path.join(captures,width+'-'+name+'.png'),fullPage:true});};
  const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width+'px');
  const open=async(suffix='')=>{await page.goto('http://127.0.0.1:'+server.address().port+'/index.html'+suffix);await page.keyboard.press('Escape');await page.locator('#welcome').waitFor({state:'hidden'});};
  const email=()=>page.locator('#account-form input[name="email"]'),password=()=>page.locator('#account-form input[name="password"]');
  const submit=()=>page.locator('#account-form button[type="submit"]'),error=()=>page.locator('#account-error');
  const resend=()=>page.locator('#account-confirmation-resend'),accepted=()=>page.locator('#account-confirmation-accepted');
  const waitText=async text=>page.waitForFunction(text=>document.querySelector('#account-error')?.textContent.includes(text),text);
  const waitEnabled=async selector=>page.waitForFunction(selector=>{const el=document.querySelector(selector);return el&&!el.disabled;},selector);
  const waitAccepted=async()=>page.waitForFunction(()=>document.querySelector('#account-confirmation-accepted')?.textContent.includes('demande a été acceptée'));
  const waitConfirmation=async()=>{await page.locator('#account-confirmation-title').waitFor();await waitEnabled('[data-action="account-confirmation-login"]');};
  const returnLogin=async()=>{
   await page.locator('[data-action="account-confirmation-login"]').click();await page.locator('#account-form[data-mode="login"]').waitFor();
   assert.equal(await password().inputValue(),'','Confirmation must never retain a password');
  };
  try{
   await open();await page.locator('#account-form').waitFor();await page.locator('[data-action="account-mode"]').click();
   assert.match(await page.locator('#account-form').innerText(),/mail de confirmation/);
   await page.locator('[name="displayName"]').fill('Test');await email().fill('new@example.invalid');await password().fill('fictional password phrase');
   await submit().click();await waitText('Trop de demandes');assert(await submit().isEnabled());
   assert.equal(await page.locator('#account-confirmation-title').count(),0,'Rejected signup must not open acceptance');assert.doesNotMatch(await error().innerText(),/provider detail/);
   signupLimited=false;await submit().click();await waitConfirmation();await waitAccepted();
   const confirmation=await page.locator('.account-confirmation').innerText();
   assert.match(confirmation,/clique sur le lien reçu/);assert.match(confirmation,/indésirables/);
   assert.match(confirmation,/ne garantit pas la réception/);assert.match(confirmation,/Si cette adresse/);
   assert.equal(await page.locator('#account-form').count(),0);assert.equal(calls.signup,2);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'account-confirmation-title');
   assert(await resend().isDisabled());assert.match(await resend().innerText(),/Renvoyer dans (59|60) s/);
   await resend().evaluate(button=>button.click());assert.equal(calls.resend,0,'Signup starts the resend cooldown');
   await fits();await capture('signup-confirmation');
   await page.clock.fastForward(30000);assert(await resend().isDisabled(),'Cooldown lasts more than 30 seconds');
   await page.clock.fastForward(31000);await waitEnabled('#account-confirmation-resend');

   // Hold the response while both clicks run, proving the in-flight lock.
   resendGate=new Promise(resolve=>{releaseResend=resolve;});
   let rejectReached;const reached=new Promise((resolve,reject)=>{resendReached=resolve;rejectReached=reject;});
   const reachedTimeout=setTimeout(()=>rejectReached(Error('The double click never reached mocked SDK resend')),15000);
   try{await resend().evaluate(button=>{button.click();button.click();});await reached;}finally{clearTimeout(reachedTimeout);}
   assert.equal(calls.resend,1,'Double click sends one SDK request');
   assert.equal(await accepted().innerText(),'','A pending response must not show acceptance');assert(await resend().isDisabled());
   releaseResend();resendGate=null;resendReached=null;await waitAccepted();assert.equal(calls.resend,1);
   await page.clock.fastForward(61000);await waitEnabled('#account-confirmation-resend');resendResult='limited';
   await resend().click();await waitText('Trop de demandes');assert.equal(calls.resend,2);
   assert.equal(await accepted().innerText(),'','429 clears earlier acceptance');assert(await resend().isDisabled());
   assert.doesNotMatch(await error().innerText(),/provider detail/);await capture('resend-provider-error');
   await page.clock.fastForward(61000);await waitEnabled('#account-confirmation-resend');resendResult='network';
   await resend().click();await waitText('n’a pas pu aboutir');assert.equal(calls.resend,3);
   assert.equal(await accepted().innerText(),'','Network failure must not show acceptance');assert(await resend().isDisabled());await fits();await capture('resend-network-error');
   await page.locator('[data-action="account-confirmation-edit"]').click();await page.locator('#account-form[data-mode="signup"]').waitFor();
   assert.equal(await email().inputValue(),'new@example.invalid');assert.equal(await password().inputValue(),'');
   await email().fill('corrected@example.invalid');assert.equal(await password().inputValue(),'');await fits();await capture('correct-address');
   await page.locator('[data-action="account-mode"]').click();

   // Repeated unconfirmed logins must not consume bad-password attempts.
   resendResult='success';
   for(let attempt=0;attempt<3;attempt++){
    await email().fill('unconfirmed@example.invalid');await password().fill('incorrect password phrase');await submit().click();await waitConfirmation();
    assert.equal(await page.locator('#account-form').count(),0);assert.equal(await accepted().innerText(),'');
    assert.doesNotMatch(await page.locator('.account-confirmation').innerText(),/incorrect|essais|une heure/);
    if(attempt===0){assert(await resend().isEnabled(),'Unconfirmed login allows direct first resend');await resend().click();await waitAccepted();assert.equal(calls.resend,4);await fits();await capture('unconfirmed-login');}
    await returnLogin();
   }
   await email().fill('unconfirmed@example.invalid');await password().fill('incorrect password phrase');
   loginError='over_request_rate_limit';await submit().click();await waitText('Trop de tentatives');assert(await submit().isEnabled());
   const callsBefore=calls.login;await context.setOffline(true);await submit().click();await waitText('connexion Internet');
   assert.equal(calls.login,callsBefore);await context.setOffline(false);loginError='invalid_credentials';
   for(const message of ['2 essais','1 essai','une heure']){await submit().click();await waitText(message);}
   assert.equal(calls.login,callsBefore+3);assert(await submit().isDisabled());assert(await page.locator('[data-action="account-forgot"]').isEnabled());
   await email().fill('other@example.invalid');assert(await submit().isEnabled());await submit().click();await waitText('2 essais');
   await email().fill('unconfirmed@example.invalid');const beforeLocked=calls.login;
   await submit().click();await waitText('une heure');assert.equal(calls.login,beforeLocked);assert(await submit().isDisabled());await fits();await capture('address-lock');
   await page.locator('[data-action="account-forgot"]').click();await page.locator('#account-forgot-form').waitFor();
   assert(await page.locator('#recovery-admin-contact').isVisible());await fits();await capture('recovery');await page.locator('[data-action="account-reset-back"]').click();
   await open();await page.locator('#account-form').waitFor();await email().fill('unconfirmed@example.invalid');await password().fill('incorrect password phrase');
   await submit().click();await waitText('une heure');assert.equal(calls.login,beforeLocked,'Reload preserves address lock');
   await page.clock.fastForward(3601000);await waitEnabled('#account-form button[type="submit"]');
   assert.doesNotMatch(await error().innerText(),/une heure/,'Expiry clears stale lock wording');await submit().click();await waitText('2 essais');assert.equal(calls.login,beforeLocked+1);

   // Expired confirmation stays separate from recovery and uses signup resend.
   await open('?auth=confirmation&keep=1#error=access_denied&error_code=otp_expired&type=signup');await page.locator('#account-confirmation-form').waitFor();
   assert.match(await page.locator('#account-confirmation-title').innerText(),/ne fonctionne plus/);
   assert.equal(await page.locator('#account-forgot-form').count(),0);assert.equal(await page.locator('input[type="password"]').count(),0);
   await page.waitForFunction(()=>location.search==='?keep=1'&&location.hash==='');
   await page.locator('#account-confirmation-form input[name="email"]').fill('callback@example.invalid');await resend().click();await waitAccepted();
   assert.equal(calls.resend,5);await fits();await capture('expired-confirmation-resend');assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
   console.log('PASS auth entry '+width+'px: mocked SDK signup/redirect, neutral acceptance, 60s cooldown, double click, resend success/429/network, blank-password correction, unconfirmed login, address lock/reload/expiry, recovery and expired confirmation; '+JSON.stringify(calls));
  }catch(error){
   await capture('failure').catch(()=>{});console.error(JSON.stringify({width,calls,pageErrors:errors,unexpected,errorText:await page.locator('#account-error').textContent().catch(()=>null)}));throw error;
  }finally{releaseResend?.();await context.close();}
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
