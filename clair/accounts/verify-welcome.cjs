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
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference',colorScheme:'light'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());
    await page.clock.install({time:new Date('2026-10-21T12:00:00Z')});await page.goto(url);await page.locator('#welcome').waitFor({state:'visible'});
    assert.equal(await page.locator('#welcome-title').getAttribute('aria-label'),'Clair');assert.equal(await page.locator('#welcome .splash-name').innerText(),'LAIR');assert.equal(await page.locator('#welcome-tagline').innerText(),'Ton budget, l’esprit tranquille.');
    assert.equal(await page.locator('#welcome button,#welcome .welcome-preview,#welcome .mascot-pose').count(),0);assert.equal(await page.locator('#welcome .splash-logo').count(),1);assert(!/\d|€/.test(await page.locator('#welcome').innerText()));
    const seek=async ms=>page.locator('#welcome').evaluate((el,ms)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=ms;}},ms);
    await seek(0);const initial=await page.locator('.splash-trace').evaluate(el=>parseFloat(getComputedStyle(el).strokeDashoffset));
    await seek(450);const midway=await page.locator('.splash-trace').evaluate(el=>parseFloat(getComputedStyle(el).strokeDashoffset));
    assert(initial>.99&&midway>0&&midway<initial,'Ruban must draw progressively');
    await seek(2500);assert((await page.locator('.splash-trace').evaluate(el=>parseFloat(getComputedStyle(el).strokeDashoffset)))<.001);assert((await page.locator('.splash-name').evaluate(el=>Number(getComputedStyle(el).opacity)))>.99);
    const geometry=await page.locator('#welcome').evaluate(el=>{const r=el.getBoundingClientRect(),content=el.querySelector('.splash-content').getBoundingClientRect();return {scroll:el.scrollWidth,w:r.width,h:r.height,x:content.x+content.width/2,y:content.y+content.height/2,bg:getComputedStyle(el).backgroundColor}});
    assert(geometry.scroll<=width+1);assert.equal(geometry.bg,'rgb(18, 14, 27)');assert(Math.abs(geometry.x-width/2)<2&&Math.abs(geometry.y-height/2)<2);
    const brand=await page.locator('.splash-brand').evaluate(el=>{const a=el.querySelector('svg').getBoundingClientRect(),b=el.querySelector('span').getBoundingClientRect();return {offset:Math.abs(a.y+a.height/2-b.y-b.height/2),gap:b.left-a.right,color:getComputedStyle(el.querySelector('span')).color};});
    assert(brand.offset<2&&brand.gap>=-7,'Name beside the C');assert.equal(brand.color,'rgb(255, 255, 255)');
    if(process.env.CLAIR_PREVIEW==='1'&&width===390)console.log('CLAIR_SPLASH_PREVIEW='+((await page.screenshot({type:'jpeg',quality:75})).toString('base64')));
    await page.clock.runFor(3000);assert(await page.locator('#welcome').isVisible());await page.clock.runFor(600);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#account-form[data-mode="login"]').waitFor();
    await page.reload();await page.locator('#welcome.splash-full').waitFor({state:'visible'});await page.clock.runFor(3600);await page.locator('#welcome').waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);await context.close();
    console.log('PASS splash Chromium '+width+'x'+height+': Ruban draw, name/signature, no sample balance/buttons, centered layout, 3.5s opening on each return');
   }
   for(const colorScheme of ['light','dark']){
    const context=await browser.newContext({reducedMotion:'reduce',colorScheme}),page=await context.newPage();await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());
    await page.clock.install();await page.goto(url);await page.locator('#welcome.splash-static').waitFor({state:'visible'});assert.equal(await page.locator('.splash-trace').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('#welcome').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 14, 27)');
    await page.clock.runFor(200);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#account-form').waitFor();await context.close();
   }
   const escapeContext=await browser.newContext(),escapePage=await escapeContext.newPage();await escapeContext.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());await escapePage.goto(url);await escapePage.locator('#welcome').waitFor({state:'visible'});await escapePage.keyboard.press('Escape');await escapePage.locator('#welcome').waitFor({state:'hidden'});await escapePage.locator('#account-form').waitFor();await escapeContext.close();
   console.log('PASS reduced motion, dark opening and Escape without a blocking introduction');
   // Restore a fictional session with the actual SDK, including slow/offline budget reads.
   const ctx=await browser.newContext({viewport:{width:390,height:844}}),pg=await ctx.newPage(),restoreErrors=[];pg.on('pageerror',e=>restoreErrors.push(e.message));await pg.clock.install({time:new Date('2026-10-21T12:00:00Z')});
   const uid='00000000-0000-4000-8000-000000000021',expires=1792670400+86400;
   const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',exp:expires}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fictional';
   const user={id:uid,email:'returning@example.test',aud:'authenticated',role:'authenticated',user_metadata:{display_name:'Test'}},session={access_token:jwt,refresh_token:'fictional-refresh',token_type:'bearer',expires_at:expires,expires_in:86400,user};
   const payload={version:3,initialized:true,setupDone:true,openingCents:4200,openingBalanceDate:'2026-10-21',transactions:[],rules:[],skipped:[],budgets:{},budgetOverrides:{},customCategories:[],savingsGoal:0,savingsSchema:1,savingsProjects:[],fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}};
   await pg.addInitScript(({uid,session,payload})=>{localStorage.setItem('clair-account-session-v1',JSON.stringify(session));localStorage.setItem('clair-account-budget-v1-'+uid,JSON.stringify({...payload,_cloud:{userId:uid,revision:1,dirty:false,operationId:'fictional-operation'}}));window.accountScenes=0;new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&(n.matches('.account-scene')||n.querySelector('.account-scene')))window.accountScenes++;}).observe(document,{childList:true,subtree:true});},{uid,session,payload});
   let release,mode='slow';const held=new Promise(resolve=>release=resolve);
   await ctx.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{const p=new URL(route.request().url()).pathname;if(p.endsWith('/clair_budgets')){if(mode==='slow')await held;if(mode==='offline'){await route.abort();return;}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{payload,revision:1,operation_id:'fictional-operation',display_name:'Test'}])});}else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(p.endsWith('/user')?user:{})});});
   const requested=pg.waitForRequest(r=>new URL(r.url()).pathname.endsWith('/clair_budgets'));await pg.goto(url);await requested;assert(await pg.locator('#welcome').isVisible(),'Session must start restoring during the opening');
   await pg.clock.runFor(3600);await pg.locator('#welcome').waitFor({state:'hidden'});await pg.locator('#account-loading').waitFor();assert.equal(await pg.locator('.account-scene').count(),0);mode='fast';release();await pg.locator('.balance-section').waitFor();assert.match(await pg.locator('.balance').innerText(),/42,00/);assert.equal(await pg.evaluate(()=>window.accountScenes),0);
   await pg.reload();await pg.locator('.balance-section').waitFor();assert(await pg.locator('#welcome').isVisible());await pg.clock.runFor(3600);await pg.locator('#welcome').waitFor({state:'hidden'});assert.equal(await pg.locator('#account-form,.account-scene').count(),0);assert.equal(await pg.evaluate(()=>window.accountScenes),0);
   mode='offline';await pg.reload();await pg.locator('.balance-section').waitFor();await pg.clock.runFor(3600);await pg.locator('#welcome').waitFor({state:'hidden'});assert.match(await pg.locator('.balance').innerText(),/42,00/);assert.equal(await pg.evaluate(()=>window.accountScenes),0);assert.deepEqual(restoreErrors,[]);await ctx.close();
   console.log('PASS persisted session: early restore, direct budget on return, no mascot flash, slow network and offline cached budget');
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
