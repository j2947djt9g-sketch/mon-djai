// Fictional sessions, intercepted Supabase, local static server. No real account or bank calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),uid='8450886d-891a-40e2-995e-ea46bb1409bc';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'express@example.invalid',user_metadata:{display_name:'QA'},app_metadata:{provider:'email'},identities:[]};
const exp=1900000000,jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp},'SYNTHETIC'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
const seed=currency=>({version:3,currency,initialized:true,setupDone:true,openingCents:100000,openingBalanceDate:'2026-11-01',transactions:[],rules:[],skipped:[],budgets:{},budgetOverrides:{},customCategories:[],savingsGoal:0,savingsSchema:1,savingsProjects:[],fixedExpenses:[],preferences:{theme:'light',wallpaper:'plain',photo:null,reminders:false}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{for(const [currency,width,standalone]of [['EUR',320,false],['EUR',390,true],['USD',390,false],['GBP',390,false],['MAD',390,false],['CAD',390,false],['CHF',390,false],['XOF',390,false],['XAF',390,false]]){
  let remote={payload:seed(currency),revision:1,operation_id:'qa-seed',display_name:'QA'},writes=0;
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,locale:'ar-MA',serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
   if(url.hostname!=='hkssnbvktfscizojhftl.supabase.co')return route.abort();
   let body={};if(url.pathname==='/auth/v1/user')body=user;
   else if(url.pathname==='/rest/v1/clair_budgets')body=remote;
   else if(url.pathname==='/rest/v1/rpc/save_clair_budget'){const input=route.request().postDataJSON();assert.equal(input.p_expected_revision,remote.revision);remote={payload:input.p_payload,revision:remote.revision+1,operation_id:input.p_operation_id,display_name:'QA'};writes++;body={saved:true,row:remote};}
   else if(url.pathname.startsWith('/rest/v1/rpc/'))throw Error('Unexpected remote mutation '+url.pathname);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.addInitScript(({user,jwt,exp,standalone})=>{localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');localStorage.setItem('clair-account-session-v1',JSON.stringify({access_token:jwt,refresh_token:'SYNTHETIC',expires_in:3600,expires_at:exp,token_type:'bearer',user}));if(standalone){Object.defineProperty(navigator,'standalone',{value:true});const original=window.matchMedia.bind(window);window.matchMedia=query=>query==='(display-mode: standalone)'?{matches:true,media:query,addEventListener(){},removeEventListener(){}}:original(query);}},{user,jwt,exp,standalone});
  await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();
  const read=()=>page.evaluate(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid)),uid);
  assert.equal((await read()).currency,currency,'Device locale must not change an existing budget currency');
  if(width===320){
   const geometry=await page.locator('.overview-controls').evaluate(controls=>{
    const original=controls.style.fontFamily;controls.style.fontFamily='Georgia, "Times New Roman", serif';
    const buttons=[...controls.querySelectorAll('.overview-entry-actions .button')],previous=buttons.map(button=>button.style.fontFamily);
    buttons.forEach(button=>{button.style.fontFamily='inherit';});
    try{
     const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
     const help=controls.querySelector('.balance-help'),summary=help.querySelector('summary'),box=action=>rect(controls.querySelector('[data-action='+action+']'));
     const measure=()=>({add:box('add'),express:box('express-open'),summary:rect(summary),help:rect(help),controls:rect(controls),scroll:document.documentElement.scrollWidth,width:innerWidth});
     const closed=measure();summary.click();const opened=measure();summary.click();return {closed,opened,reclosed:measure()};
    }
    finally{controls.style.fontFamily=original;buttons.forEach((button,index)=>{button.style.fontFamily=previous[index];});}
   });
   for(const state of ['closed','reclosed']){
    const g=geometry[state];
    assert(Math.abs(g.add.y-g.express.y)<2&&Math.abs(g.summary.y-g.add.y)<2,'320px closed helper and both actions must share a row with a wide fallback font');
    assert(g.add.height>=44&&g.express.height>=44&&g.summary.height>=44,'Home controls retain 44px touch height');
    assert(g.add.width>=44&&g.express.width>=44&&g.summary.width>=44,'Home controls retain 44px touch width');
    assert(g.scroll<=g.width+1,'Wide fallback font must not cause horizontal overflow');
   }
   assert(Math.abs(geometry.opened.help.width-geometry.opened.controls.width)<2,'Open help spans the complete controls row');
   assert(geometry.opened.add.y>=geometry.opened.help.bottom-1,'Actions move below expanded help');
   assert(geometry.opened.scroll<=geometry.opened.width+1,'Expanded help must not overflow');

  }

  await page.locator('[data-action="express-open"]:visible').click();assert.equal((await read()).preferences.express,undefined);
  await page.getByRole('button',{name:'Utiliser mon budget Clair',exact:true}).click();await page.locator('#express-form').waitFor();
  assert.equal((await read()).transactions.length,0);const ticket=await page.locator('#express-form [name=requestId]').inputValue();
  await page.locator('#express-form [data-action="express-amount"]').first().click();assert.equal((await read()).transactions.length,0,'Shortcut only fills');
  const amount=page.locator('#express-form [name=amount]');await amount.fill('0');await amount.press('Enter');assert.equal((await read()).transactions.length,0);
  assert.equal(await page.locator('#express-form [name=requestId]').inputValue(),ticket);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Viewport must not overflow');
  await context.setOffline(true);await amount.fill(currency.startsWith('X')?'25':'0,50');
  await page.locator('#express-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});await page.locator('#dialog').waitFor({state:'hidden'});
  let saved=await read();assert.equal(saved.transactions.length,1);const tx=saved.transactions[0],metadata=JSON.stringify(tx.express);assert.equal(tx.amountCents,currency.startsWith('X')?2500:50);assert.equal(tx.express.originalCurrency,currency);
  await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));
  await page.waitForFunction(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid))._cloud?.dirty===false,uid,{timeout:15000});
  assert.equal(remote.payload.transactions.length,1,'Reconnection saves exactly one expense');assert.equal(JSON.stringify(remote.payload.transactions[0].express),metadata);assert(writes>=1);
  await page.getByRole('button',{name:'Modifier',exact:true}).click();await page.locator('#tx-form').waitFor();assert.equal(await page.locator('#tx-form [name=categoryId]').inputValue(),'non-classee','Classic correction must keep the Express fallback category');assert.equal(await page.locator('#tx-form [name=categoryId] option[value=non-classee]').innerText(),'Non classée');await page.locator('#tx-form [name=amount]').fill(currency.startsWith('X')?'30':'3');await page.locator('#tx-form button[type=submit]').click();await page.locator('#dialog').waitFor({state:'hidden'});
  saved=await read();assert.equal(saved.transactions.length,1);assert.equal(saved.transactions[0].categoryId,'non-classee','Editing only amount must retain Non classée');assert.equal(saved.transactions[0].amountCents,currency.startsWith('X')?3000:300);assert.equal(JSON.stringify(saved.transactions[0].express),metadata,'Classic correction preserves provenance');
  await page.locator('[data-nav=journal]:visible').first().click();assert.match(await page.locator('#journal-results').innerText(),/Non classée/,'Journal must show the fallback category label');
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS Express ${currency} ${width}px${standalone?' simulated standalone':''}: confirmation, shortcut, invalid/retry, double submit, offline/reconnect single transaction, correction/provenance, no overflow`);
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
