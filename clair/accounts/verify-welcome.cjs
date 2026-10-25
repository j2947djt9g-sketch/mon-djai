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
    await page.clock.install({time:new Date('2026-10-21T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-21T12:00:01Z'));await page.goto(url);await page.locator('#welcome').waitFor({state:'visible'});
    assert.equal(await page.locator('#welcome-title').getAttribute('aria-label'),'Clair');assert.equal(await page.locator('.splash-name title').textContent(),'LAIR');assert.equal(await page.locator('#welcome-tagline').innerText(),'Ton budget, l’esprit tranquille.');
    assert.equal(await page.locator('#welcome button,#welcome .welcome-preview,#welcome .mascot-pose').count(),0);assert.equal(await page.locator('#welcome .splash-logo').count(),1);assert(!/\d|€/.test(await page.locator('#welcome').innerText()));
    const seek=async ms=>page.locator('#welcome').evaluate((el,ms)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=ms;}},ms);
    const offsets=async()=>page.locator('.splash-trace,.splash-letter').evaluateAll(nodes=>nodes.map(el=>parseFloat(getComputedStyle(el).strokeDashoffset)));
    const partial=value=>value>0.001&&value<.999;
    await seek(0);assert((await offsets()).every(value=>value>.999),'All letters start undrawn');assert((await page.locator('.splash-trace,.splash-letter').evaluateAll(nodes=>nodes.map(el=>Number(getComputedStyle(el).opacity)))).every(value=>value===0),'No round pen tips may flash before drawing');const firstBox=await page.locator('.splash-wordmark').boundingBox();
    await seek(600);let strokes=await offsets();assert(partial(strokes[0])&&strokes.slice(1).every(value=>value>.999),'C draws first');
    await seek(1100);strokes=await offsets();assert(strokes[0]<.001&&partial(strokes[1])&&strokes.slice(2).every(value=>value>.999),'L follows C');
    await seek(1550);strokes=await offsets();assert(strokes[1]<.001&&partial(strokes[2])&&strokes.slice(4).every(value=>value>.999),'A draws after L');
    await seek(1960);strokes=await offsets();assert(strokes[2]<.001&&strokes[3]<.001&&partial(strokes[4])&&strokes[5]>.999,'I follows the completed A');
    await seek(2200);strokes=await offsets();assert(strokes[4]<.001&&partial(strokes[5])&&strokes[6]>.999,'R traces its bowl before the diagonal');
    await seek(2700);assert((await offsets()).every(value=>value<.001),'All strokes finish before the reading pause');assert.deepEqual(await page.locator('.splash-wordmark').boundingBox(),firstBox,'Drawing must never shift the wordmark');assert(firstBox.x>=0&&firstBox.x+firstBox.width<=width);
    if(process.env.CLAIR_PREVIEW==='1'&&width===390){
     const frames=[];for(const ms of [0,600,1100,1550,2200,2700]){await seek(ms);frames.push({ms,data:(await page.screenshot({type:'png',clip:{x:0,y:height/2-110,width,height:220}})).toString('base64')});}
     const preview=await context.newPage();await preview.setContent('<canvas width="1170" height="500"></canvas>');
     const sheet=await preview.evaluate(async frames=>{const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle='#100c19';ctx.fillRect(0,0,1170,500);ctx.font='16px sans-serif';for(let i=0;i<frames.length;i++){const img=new Image();img.src='data:image/png;base64,'+frames[i].data;await img.decode();const x=i%3*390,y=Math.floor(i/3)*250;ctx.fillStyle='#c5b8dc';ctx.fillText((frames[i].ms/1000).toFixed(2)+' s',x+18,y+23);ctx.drawImage(img,x,y+30);}return canvas.toDataURL('image/jpeg',.8).split(',')[1]},frames);
     console.log('CLAIR_LETTER_STAGES='+sheet);await preview.close();
    }
    const geometry=await page.locator('#welcome').evaluate(el=>{const r=el.getBoundingClientRect(),content=el.querySelector('.splash-content').getBoundingClientRect();return {scroll:el.scrollWidth,w:r.width,h:r.height,x:content.x+content.width/2,y:content.y+content.height/2,bg:getComputedStyle(el).backgroundColor}});
    assert(geometry.scroll<=width+1);assert.equal(geometry.bg,'rgb(16, 12, 25)');assert(Math.abs(geometry.x-width/2)<2&&Math.abs(geometry.y-height/2)<2);
    if(process.env.CLAIR_PREVIEW==='1'&&width===390)console.log('CLAIR_SPLASH_PREVIEW='+((await page.screenshot({type:'jpeg',quality:75})).toString('base64')));
    await page.clock.runFor(3200);await page.locator('#welcome.splash-leaving').waitFor();assert.equal(await page.locator('#welcome').evaluate(el=>getComputedStyle(el,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0)');
    await page.locator('#welcome').evaluate(el=>{const exit=el.getAnimations().find(a=>a.animationName==='splash-exit');exit.pause();exit.currentTime=350;});const opacity=await page.locator('#welcome').evaluate(el=>Number(getComputedStyle(el).opacity));assert(opacity>0&&opacity<1);await page.locator('#account-form[data-mode="login"]').waitFor();const loginBox=await page.locator('#account-form').boundingBox();
    await page.clock.runFor(700);await page.locator('#welcome').waitFor({state:'hidden'});assert.deepEqual(await page.locator('#account-form').boundingBox(),loginBox,'Login form stays in place when the fade completes');
    await page.reload();await page.locator('#welcome.splash-full').waitFor({state:'visible'});await page.clock.runFor(4000);await page.locator('#welcome').waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);await context.close();
    console.log('PASS splash Chromium '+width+'x'+height+': unchanged ordered C/L/A/I/R strokes, stable centered layout, 3.9-second opening and crossfade into login');
   }
   for(const colorScheme of ['light','dark']){
    const context=await browser.newContext({reducedMotion:'reduce',colorScheme}),page=await context.newPage();await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());
    await page.clock.install({time:new Date('2026-10-21T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-21T12:00:01Z'));await page.goto(url);await page.locator('#welcome.splash-static').waitFor({state:'visible'});assert.equal(await page.locator('.splash-trace').evaluate(el=>getComputedStyle(el).animationName),'none');assert((await page.locator('.splash-letter').evaluateAll(nodes=>nodes.map(el=>({offset:parseFloat(getComputedStyle(el).strokeDashoffset),animation:getComputedStyle(el).animationName})))).every(value=>value.offset===0&&value.animation==='none'),'Reduced motion shows the complete word immediately');
    if(colorScheme==='dark')assert.equal(await page.locator('#welcome').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 12, 25)');
    await page.clock.runFor(200);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#account-form').waitFor();await context.close();
   }
   const escapeContext=await browser.newContext(),escapePage=await escapeContext.newPage();await escapeContext.route('https://hkssnbvktfscizojhftl.supabase.co/**',r=>r.abort());await escapePage.goto(url);await escapePage.locator('#welcome').waitFor({state:'visible'});await escapePage.keyboard.press('Escape');await escapePage.locator('#welcome').waitFor({state:'hidden'});await escapePage.locator('#account-form').waitFor();await escapeContext.close();
   console.log('PASS reduced motion, dark opening and Escape without a blocking introduction');
   // Account entry uses real handlers with a mocked HTTP transport.
   for(const [width,height,colorScheme]of [[1440,1000,'light'],[390,844,'light'],[320,568,'light'],[768,844,'dark']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',colorScheme});
    const page=await context.newPage(),errors=[],calls={login:0,recovery:0};page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-21T12:00:00Z')});
    await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{
      const request=route.request(),pathname=new URL(request.url()).pathname;
      if(pathname.endsWith('/token')){calls.login++;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',message:'Invalid login credentials'})});}
      else if((pathname.endsWith('/recover')||pathname.endsWith('/clair-account-recovery'))){calls.recovery++;await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({ok:true,retry_after:60})});}
      else await route.fulfill({status:200,contentType:'application/json',body:'{}'});
    });
    await page.goto(url);await page.locator('#welcome').waitFor({state:'hidden'});await page.locator('#account-form[data-mode="login"]').waitFor();
    assert.equal(await page.locator('.account-layout').count(),1);
    assert.equal(await page.locator('.account-scene .mascot-pose').count(),1);
    assert.equal(await page.locator('.account-form-pane .brand-mark').count(),0);
    assert.equal(await page.locator('.sidebar').isVisible(),false);
    const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cols:getComputedStyle(document.querySelector('.account-layout')).gridTemplateColumns.split(' ').length,panel:getComputedStyle(document.querySelector('.account-layout')).getPropertyValue('--auth-panel').trim()}));
    assert(geometry.scroll<=width+1,'account overflows at '+width);
    assert.equal(geometry.cols,width>760?2:1);assert.equal(geometry.panel,colorScheme==='dark'?'#1c152c':'#fff');
    assert(!/Changer l.image|Design Split|bout en bout|v2.4/.test(await page.locator('.account-layout').innerText()));
    const source=await page.locator('.account-scene .mascot-pose').evaluate(el=>getComputedStyle(el).backgroundImage);
    const imageMatch=source.match(/url\(["']?([^"')]+)["']?\)/);assert(imageMatch,'Account mascot must have a local image');const imagePath=imageMatch[1];assert((await context.request.get(imagePath)).ok(),'mascot asset missing');
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
    assert(await page.locator('#recovery-admin-contact').isVisible());assert(await page.locator('#account-reset-resend').isDisabled());await page.clock.runFor(61000);await page.locator('#account-reset-resend').click();await page.waitForFunction(()=>document.querySelector('#account-reset-resend').disabled);assert.equal(calls.recovery,2);
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
