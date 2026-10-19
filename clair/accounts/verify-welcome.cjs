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
  }finally{await browser.close();}
 }
 main().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1});
})();
