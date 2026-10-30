// Complete request -> admin approval -> same-device new password flow. All accounts and transports are fixtures.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',{'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{
 const {createUnlockHandler}=await import('../../supabase/functions/clair-device-unlock/handler.mjs');
 const {createHandler}=await import('../../supabase/functions/clair-masterboard/core.mjs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 try{for(const width of [320,390,1440]){
  const uid='22222222-2222-4222-8222-222222222222',admin='11111111-1111-4111-8111-111111111111',now=new Date(),exp=Math.floor(Date.now()/1000)+3600;
  const user={id:uid,email:'member@example.invalid',email_confirmed_at:null,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},identities:[]};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp},'FIXTURE'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
  const rows=new Map();let oldPassword='PreviousPassword_42',generated=0,updated=0,identityVerified=false,approvedId=null;
  const device=createUnlockHandler({fingerprint:async()=>'f'.repeat(64),db:{
   request:async(id,email,hash,label)=>{rows.set(id,{id,email,hash,device_label:label,status:'pending',expires_at:new Date(+now+86400000).toISOString()});return true;},
   claim:async(id,hash)=>{const r=rows.get(id);if(!r||r.hash!==hash||r.status==='issued'||r.status==='completed')return {state:'expired'};if(r.status==='approved'){r.status='issued';return {state:'ready',email:r.email,user_id:uid};}return {state:'pending'};},
   complete:async(id,hash,who)=>{const r=rows.get(id);if(r?.hash!==hash||r?.status!=='issued'||who!==uid)return false;r.status='completed';return true;}
  },auth:{user:async()=>identityVerified?user:null,recovery:async()=>{generated++;return {hashed_token:'a'.repeat(64)};}}});
  const adminHandler=createHandler({now:()=>now,db:{
   isAdmin:async id=>id===admin,unlockRequest:async id=>rows.get(id),beginUnlock:async id=>{const r=rows.get(id);if(r.status!=='pending')return false;r.status='approving';return true;},
   approveUnlock:async id=>{rows.get(id).status='approved';approvedId=id;},log:async()=>{}
  },auth:{user:async()=>({id:admin,email_confirmed_at:'yes',last_sign_in_at:now.toISOString()}),target:async()=>user,invalidatePassword:async()=>{oldPassword='unknown random replacement';}}});
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route(origin+'/clair/',r=>r.fulfill({status:200,contentType:'text/html',body:'<h1>Clair ouvert</h1>'}));
  await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;let body={},status=200;
   if(p==='/functions/v1/clair-device-unlock'){
    const response=await device(new Request(req.url(),{method:'POST',headers:{origin},body:req.postData()}));
    return route.fulfill({status:response.status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:await response.text()});
   }
   if(p==='/rest/v1/rpc/clair_account_active')body=true;else if(p==='/auth/v1/verify'){assert.equal(req.postDataJSON().type,'recovery');assert.equal(req.postDataJSON().token_hash,'a'.repeat(64));identityVerified=true;user.email_confirmed_at=now.toISOString();body={access_token:jwt,refresh_token:'FIXTURE',expires_at:exp,expires_in:3600,token_type:'bearer',user};}
   else if(p==='/auth/v1/user'){assert(identityVerified);if(req.method()==='PUT'){assert.equal(req.postDataJSON().password,'NewPassword_42');updated++;}body=user;}
   else if(p==='/auth/v1/token'){assert.equal(req.postDataJSON().password,'NewPassword_42');body={access_token:jwt,refresh_token:'FIXTURE_MAIN',expires_at:exp,expires_in:3600,token_type:'bearer',user};}
   else if(p==='/auth/v1/logout')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});
   await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
  });
  await page.addInitScript(()=>localStorage.setItem('budget-history-fixture','must remain unchanged'));
  await page.goto(origin+'/clair/index.html');await page.locator('#du-open').click();await page.locator('#device-unlock-dialog').waitFor({state:'visible'});await page.getByRole('button',{name:'Fermer le déblocage'}).click();
  await page.goto(origin+'/clair/help.html');await page.locator('#du-email').fill(user.email);await page.locator('#du-request button').click();await page.locator('#du-check').waitFor();
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-device-unlock-v1')));assert(rows.has(record.id));assert.equal(generated,0);
  // Another device can request the same email but cannot use this device's approval.
  const other='44444444-4444-4444-8444-444444444444',otherSecret='c'.repeat(64);
  await device(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({action:'request',id:other,secret:otherSecret,email:user.email,device:'Other device'})}));
  const response=await adminHandler(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({action:'authorize-reset',user_id:uid,confirm_email:user.email,request_id:record.id})}));
  assert.equal(response.status,200);assert.equal(oldPassword,'unknown random replacement');assert.equal(approvedId,record.id);
  const notApproved=await device(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({action:'poll',id:other,secret:otherSecret})}));assert.equal((await notApproved.json()).state,'pending');assert.equal(generated,0);
  await page.locator('#du-check').click();await page.locator('#du-password').waitFor();assert.equal(generated,1);
  assert.match(await page.locator('#device-unlock-root').innerText(),/administrateur a débloqué/);
  assert.equal(await page.locator('a[href*="token"],.recovery-code').count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage}).includes('a'.repeat(64))),false);
  await page.locator('#du-new-password').fill('NewPassword_42');await page.locator('#du-confirm-password').fill('OtherPassword_42');await page.locator('#du-password button').click();assert.equal(updated,0);assert.match(await page.locator('#du-error').innerText(),/différents/);
  await page.locator('#du-confirm-password').fill('NewPassword_42');
  if(process.env.CLAIR_PREVIEW==='1'&&width===390)console.log('DEVICE_UNLOCK_SCREENSHOT_390='+(await page.screenshot({fullPage:true})).toString('base64'));
  await page.locator('#du-password button').click();await page.getByRole('heading',{name:'Clair ouvert'}).waitFor();assert.equal(updated,1);assert.equal(rows.get(record.id).status,'completed');
  assert.equal(await page.evaluate(()=>localStorage.getItem('budget-history-fixture')),'must remain unchanged');assert.equal(await page.evaluate(()=>localStorage.getItem('clair-device-unlock-v1')),null);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('clair-account-session-v1')));assert.equal(saved.user.id,uid);
  assert.deepEqual(errors,[]);await context.close();console.log('PASS device unlock '+width+'px: request in app, real admin handler, old password invalidated, unconfirmed account supported, other-device isolation, no link or code to share, new password and same-account login with preserved history');
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(error=>{console.error(error);server.close();process.exitCode=1});
