// Browser installation lifecycle uses synthetic prompts; no application is actually installed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');let browser;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,home=origin+'/masterboard/';
 browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  // Prevent native eligibility timing from interfering with the deliberately controlled prompts.
  await context.addInitScript(()=>window.addEventListener('beforeinstallprompt',event=>{if(event.isTrusted){event.preventDefault();event.stopImmediatePropagation();}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(home);await page.locator('#login').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('main').inert);
  const manifest=await (await page.request.get(home+'manifest.webmanifest')).json();
  assert.equal(new URL(manifest.id,home).href,home);assert.equal(new URL(manifest.scope,home).href,home);assert.equal(new URL(manifest.start_url,home).href,home);assert.equal(manifest.display,'standalone');assert.equal(manifest.name,'Clair Masterboard');
  for(const icon of manifest.icons){const response=await page.request.get(new URL(icon.src,home).href);assert.equal(response.status(),200);}
  const header=page.locator('.header-install'),dialog=page.locator('#install-dialog');
  await header.click();await dialog.waitFor({state:'visible'});assert.match(await dialog.innerText(),/Chrome ou Edge/);assert.equal(await page.locator('#install-now').isVisible(),false);
  await page.evaluate(()=>{
   const event=new Event('beforeinstallprompt',{cancelable:true});
   window.promptCalls=0;event.prompt=async()=>{window.promptCalls++;};event.userChoice=Promise.resolve({outcome:'dismissed'});
   window.dispatchEvent(event);window.wasPrevented=event.defaultPrevented;
  });
  assert.equal(await page.evaluate(()=>window.wasPrevented),true);assert.equal(await page.evaluate(()=>window.promptCalls),0);
  await page.locator('#install-now').click();await page.locator('#install-status').filter({hasText:'Installation annulée'}).waitFor();assert.equal(await page.evaluate(()=>window.promptCalls),1);assert.equal(await header.isVisible(),true);
  assert.equal(await page.locator('#install-now').isVisible(),false);
  await page.locator('#close-install').press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await header.evaluate(e=>e===document.activeElement),true);
  await page.evaluate(()=>{
   const event=new Event('beforeinstallprompt',{cancelable:true});
   event.prompt=async()=>{window.promptCalls++;};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);
  });
  await header.click();await page.locator('#install-status').filter({hasText:'Installation demandée'}).waitFor();assert.equal(await page.evaluate(()=>window.promptCalls),2);assert.equal(await header.isVisible(),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));assert.equal(await page.locator('#install-now').isVisible(),false);
  await page.locator('#close-install').click();
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const registration=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return {scope:reg.scope,script:reg.active.scriptURL};});
  assert.equal(registration.scope,home);assert.equal(registration.script,home+'sw.js');
  await page.evaluate(async()=>{const cache=await caches.open('clair-github-/clair/unchanged-fixture');await cache.put('/clair/fixture',new Response('Clair cache stays separate'));});
  const cached=await page.evaluate(async()=>{const all=[];for(const name of await caches.keys()){if(name.startsWith('clair-masterboard-offline-')){const c=await caches.open(name);for(const request of await c.keys())all.push(request.url);}}return all;});
  assert.deepEqual(cached,[home+'offline.html']);
  // Even an API-shaped request on this origin must never be stored by the worker.
  await page.evaluate(()=>fetch('private-snapshot?email=never-cache@example.invalid').catch(()=>{}));
  assert.equal(await page.evaluate(async()=>Boolean(await caches.match('private-snapshot?email=never-cache@example.invalid'))),false);
  await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Une connexion pour continuer.'}).waitFor();assert.equal(await page.locator('#board').count(),0);
  await context.setOffline(false);await page.getByRole('link',{name:'Réessayer'}).click();await page.locator('#login').waitFor({state:'visible'});
  assert.equal(await page.evaluate(async()=>await caches.has('clair-github-/clair/unchanged-fixture')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS masterboard installation: scoped standalone manifest and icons, manual desktop fallback, deferred and single-use browser prompts, honest cancellation and acceptance, installed-event UI, isolated worker, static-only cache and offline reconnection');
 }finally{await context.close();}
 const ios=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 try{
  const page=await ios.newPage();await page.goto(home);await page.locator('#login').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('main').inert);
  await page.locator('.header-install').click();assert.match(await page.locator('#install-instructions').innerText(),/Safari/);assert.match(await page.locator('#install-instructions').innerText(),/Sur l’écran d’accueil/);
  if(process.env.CLAIR_PREVIEW==='1')console.log('INSTALL_SCREENSHOT_390='+(await page.screenshot({animations:'disabled'})).toString('base64'));
  await page.locator('#close-install').click();
  await page.emulateMedia({media:'screen'});await ios.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true,configurable:true}));
  await page.reload();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('.header-install').isVisible(),false);
  console.log('PASS masterboard iPhone installation instructions and standalone mode without duplicate installation prompt');
 }finally{await ios.close();await browser.close();}
})().then(()=>server.close()).catch(async error=>{console.error(error);await browser?.close().catch(()=>{});server.close();process.exitCode=1});
