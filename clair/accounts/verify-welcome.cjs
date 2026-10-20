// Visual onboarding checks; no real account requests.
(function verifyWelcome(){
 const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
 const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const body=fs.readFileSync(file);res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
 async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/index.html';
  const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
  try{
   for(const [width,height]of [[1440,1000],[390,844],[320,568],[768,844]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());
    await page.clock.install({time:new Date('2026-10-19T12:00:00Z')});await page.goto(url);await page.locator('#welcome').waitFor({state:'visible'});
    assert.match(await page.locator('#welcome-title').innerText(),/Ton budget,[\s\S]*l’esprit tranquille/);assert.equal(await page.locator('#welcome .brand-mark svg').count(),1);
    assert.equal(await page.locator('#welcome .welcome-example').innerText(),'Exemple fictif');assert.equal(await page.locator('#welcome .mascot-pose').count(),0);
    const geometry=await page.locator('#welcome').evaluate(el=>{const r=el.getBoundingClientRect(),button=document.querySelector('#welcome-skip').getBoundingClientRect(),login=document.querySelector('#welcome-login').getBoundingClientRect();return {width:r.width,scroll:el.scrollWidth,color:getComputedStyle(el).backgroundColor,button:button.bottom,login:login.bottom}});assert(geometry.scroll<=width+1);assert.equal(geometry.color,'rgb(248, 245, 255)');assert(geometry.button<=height&&geometry.login<=height,'welcome actions outside the viewport at '+width+'x'+height);
    assert.equal(await page.locator('#welcome-skip').innerText(),'Commencer →');assert.equal(await page.locator('#welcome-login').isVisible(),true);
    await page.clock.runFor(2100);assert.equal(await page.locator('#welcome .welcome-playing').count(),0);assert(await page.locator('#welcome').isVisible());
    if(process.env.CLAIR_PREVIEW==='1'&&width===390)console.log('CLAIR_WELCOME_PREVIEW='+((await page.screenshot({type:'jpeg',quality:65})).toString('base64')));
    await page.locator('#welcome-skip').click();await page.locator('#account-form[data-mode="signup"]').waitFor();assert.equal(await page.locator('#welcome').isVisible(),false);assert.deepEqual(errors,[]);
    console.log('PASS welcome Chromium '+width+'x'+height+': Ruban logo, new signature, lavender background, visible actions, static logo and signup entry');await context.close();
   }
   const loginContext=await browser.newContext(),loginPage=await loginContext.newPage();await loginContext.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());await loginPage.goto(url);await loginPage.locator('#welcome-login').click();await loginPage.locator('#account-form[data-mode="login"]').waitFor();await loginContext.close();
   const reduced=await browser.newContext({reducedMotion:'reduce'}),reducedPage=await reduced.newPage();await reduced.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());await reducedPage.goto(url);await reducedPage.locator('#account-form').waitFor();assert.equal(await reducedPage.locator('#welcome').isVisible(),false);await reduced.close();console.log('PASS welcome: login path and reduced-motion bypass preserved; no real account requests');
  
   // Account entry uses real handlers with a mocked HTTP transport.
   for(const [width,height,colorScheme]of [[1440,1000,'light'],[390,844,'light'],[320,568,'light'],[768,844,'dark']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',colorScheme});
    const page=await context.newPage(),errors=[],calls={login:0,recovery:0};page.on('pageerror',e=>errors.push(e.message));
    await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{
      const request=route.request(),pathname=new URL(request.url()).pathname;
      if(pathname.endsWith('/token')){calls.login++;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',message:'Invalid login credentials'})});}
      else if(pathname.endsWith('/recover')){calls.recovery++;await route.fulfill({status:200,contentType:'application/json',body:'{}'});}
      else await route.fulfill({status:200,contentType:'application/json',body:'{}'});
    });
    await page.goto(url);await page.locator('#account-form[data-mode="login"]').waitFor();
    assert.equal(await page.locator('.account-layout').count(),1);
    assert.equal(await page.locator('.account-scene .mascot-pose').count(),1);
    assert.equal(await page.locator('.account-form-pane .brand-mark').count(),0);
    assert.equal(await page.locator('.sidebar').isVisible(),false);
    const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cols:getComputedStyle(document.querySelector('.account-layout')).gridTemplateColumns.split(' ').length,panel:getComputedStyle(document.querySelector('.account-layout')).getPropertyValue('--auth-panel').trim()}));
    assert(geometry.scroll<=width+1,'account overflows at '+width);
    assert.equal(geometry.cols,width>760?2:1);assert.equal(geometry.panel,colorScheme==='dark'?'#1c152c':'#fff');
    assert(!/Changer l.image|Design Split|bout en bout|v2.4/.test(await page.locator('.account-layout').innerText()));
    const source=await page.locator('.account-scene .mascot-pose').evaluate(el=>getComputedStyle(el).backgroundImage);
    const imagePath=source.match(/url\(["']?([^"')]+)["']?\)/)[1];assert((await context.request.get(imagePath)).ok(),'mascot asset missing');
    if(process.env.CLAIR_PREVIEW==='1'&&(width===1440||width===390||colorScheme==='dark'))console.log('CLAIR_AUTH_PREVIEW_'+width+'='+((await page.screenshot({type:'jpeg',quality:65})).toString('base64')));
    await page.locator('#account-form input[name="email"]').fill('demo@example.test');
    await page.locator('#account-form input[name="password"]').fill('fictional-password-42');
    await page.locator('[data-action="account-entry-toggle"]').click();assert.equal(await page.locator('#account-form input[name="password"]').getAttribute('type'),'text');
    await page.locator('[data-action="account-entry-toggle"]').click();assert.equal(await page.locator('#account-form input[name="password"]').getAttribute('type'),'password');
    await page.locator('#account-form button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('#account-error')?.textContent.trim());
    assert.equal(calls.login,1);assert.equal(await page.locator('#account-form[data-mode="login"]').count(),1,'failed sign-in must never show a fake connected state');
    await page.locator('[data-action="account-forgot"]').click();await page.locator('#account-forgot-form').waitFor();
    assert.equal(await page.locator('#account-forgot-form input[name="email"]').inputValue(),'demo@example.test');
    await page.locator('#account-forgot-form button[type="submit"]').click();await page.locator('#account-reset-resend').waitFor();assert.equal(calls.recovery,1);
    await page.locator('#account-reset-resend').click();await page.waitForFunction(()=>!document.querySelector('#account-reset-resend').disabled);assert.equal(calls.recovery,2);
    await page.locator('[data-action="account-reset-edit"]').click();await page.locator('#account-forgot-form').waitFor();
    await page.locator('[data-action="account-reset-back"]').click();await page.locator('#account-form[data-mode="login"]').waitFor();
    await page.locator('[data-action="account-mode"]').click();await page.locator('#account-form[data-mode="signup"]').waitFor();assert.equal(await page.locator('input[name="displayName"]').count(),1);
    assert.equal(await page.locator('#account-form input[name="email"]').inputValue(),'demo@example.test');
    assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+1);
    assert.deepEqual(errors,[]);await context.close();
    console.log('PASS account entry '+width+'x'+height+' '+colorScheme+': responsive mascot, local image, real failed-login handling, password visibility, recovery/resend/edit, signup and no horizontal overflow');
   }

  }finally{await browser.close();}
 }
 main().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1});
})();
