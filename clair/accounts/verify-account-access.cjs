// Real app and admin handlers, intercepted network, fictional identities only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),box={window:{},Date,Intl};vm.createContext(box);vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],box);const E=box.window.ClairEngine;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 const {createHandler}=await import('../../supabase/functions/clair-masterboard/core.mjs');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const now=new Date(),uid='8450886d-891a-40e2-995e-ea46bb1409bc',adminId='8450886d-891a-40e2-995e-ea46bb1409bd',user={id:uid,aud:'authenticated',role:'authenticated',email:'suspension@example.invalid',email_confirmed_at:now.toISOString(),user_metadata:{},app_metadata:{provider:'email'},identities:[{id:uid,provider:'email'}]};
  const admin={id:adminId,email_confirmed_at:now.toISOString(),last_sign_in_at:now.toISOString()};let suspended=false,writes=0;
  const handler=createHandler({now:()=>now,db:{isAdmin:async id=>id===adminId,log:async()=>{},disableDevices:async()=>{}},auth:{user:async()=>admin,target:async()=>user,ban:async(id,value)=>{assert.equal(id,uid);suspended=value;}}});
  const manage=async action=>{const response=await handler(new Request('https://example.invalid/admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,user_id:uid,confirm_email:user.email})}));assert.equal(response.status,200,await response.text());};
  const exp=Math.floor(+now/1000)+86400,jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp,iss:'https://hkssnbvktfscizojhftl.supabase.co/auth/v1'},'FIXTURE-SIGNATURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
  const seed=E.empty();seed.initialized=seed.setupDone=true;seed.openingCents=10000;seed.openingBalanceDate=E.today();seed.preferences.guideVersion=1;seed.transactions=[{id:'retained-history',date:E.today(),name:'Historique conservé',type:'expense',amountCents:500,categoryId:'autre'}];
  let row={payload:seed,revision:1,operation_id:'original',display_name:'Fixture'};
  await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname;let body={};
   if(p==='/rest/v1/rpc/clair_account_active')body=!suspended;
   else if(p==='/auth/v1/user')body=user;
   else if(p==='/rest/v1/clair_budgets')body=suspended?null:row;
   else if(p==='/rest/v1/rpc/save_clair_budget'){assert(!suspended,'Suspended account reached save endpoint');writes++;const data=req.postDataJSON();row={payload:data.p_payload,revision:row.revision+1,operation_id:data.p_operation_id,display_name:'Fixture'};body={saved:true,row};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.addInitScript(({uid,user,jwt,exp,seed})=>{sessionStorage.setItem('clair-splash-v2','1');localStorage.setItem('clair-account-session-v1',JSON.stringify({access_token:jwt,refresh_token:'FIXTURE-REFRESH',expires_at:exp,expires_in:86400,token_type:'bearer',user}));if(!localStorage.getItem('clair-account-budget-v1-'+uid))localStorage.setItem('clair-account-budget-v1-'+uid,JSON.stringify({...seed,_cloud:{userId:uid,revision:1,dirty:false,operationId:'original'}}));},{uid,user,jwt,exp,seed});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.keyboard.press('Escape');await page.locator('.balance-section').waitFor();await page.waitForFunction(()=>document.querySelector('#status-label')?.textContent==='Synchronisé');
  const stored=()=>page.evaluate(uid=>localStorage.getItem('clair-account-budget-v1-'+uid),uid),original=await stored();
  const openExpense=async()=>{await page.locator('[data-action="add"]').click();await page.locator('[data-action="expense"]').click();await page.locator('#tx-form [name="name"]').fill('Nouvelle dépense');await page.locator('#tx-form [name="amount"]').fill('3,50');};
  await openExpense();await manage('suspend');await page.locator('#tx-form button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('#form-error')?.textContent.includes('Paie ton abonnement'));
  assert.equal(await stored(),original);assert.equal(writes,0);assert.match(await page.locator('#sync-alert').innerText(),/Paie ton abonnement pour continuer/);
  await page.locator('#dialog [data-action="close"]').first().click();await page.locator('[data-action="add"]').click();assert.equal(await page.locator('#dialog').isVisible(),false);assert.equal(await stored(),original);
  await page.reload();await page.keyboard.press('Escape');await page.locator('#sync-alert [role="alert"]').waitFor();assert.equal(await stored(),original);
  await context.setOffline(true);await page.locator('[data-action="add"]').click();assert.equal(await stored(),original);assert.match(await page.locator('#sync-alert').innerText(),/Paie ton abonnement/);
  await context.setOffline(false);await manage('restore');await page.locator('[data-action="account-sync"]').click();await page.waitForFunction(()=>document.querySelector('#status-label')?.textContent==='Synchronisé');
  await openExpense();await page.locator('#tx-form button[type="submit"]').click();await page.locator('#tx-form').waitFor({state:'hidden'});await page.waitForFunction(uid=>JSON.parse(localStorage.getItem('clair-account-budget-v1-'+uid))?._cloud?.dirty===false,uid);
  const restored=JSON.parse(await stored());assert.equal(restored.transactions.length,2);assert(restored.transactions.some(t=>t.id==='retained-history'));assert.equal(writes,1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log('PASS account suspension '+width+'px: real admin suspend, pre-opened form blocked, no local or remote transaction, payment message, reload/offline persistence, restore and retained history');await context.close();
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1;});
