// Official SDK with mocked transports only. No real recovery link, email or password is created.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('content-type',{'.html':'text/html','.js':'application/javascript','.css':'text/css'}[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  for(const mode of ['token','code','expired']){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
   const uid='22222222-2222-4222-8222-222222222222',exp=Math.floor(Date.now()/1000)+3600,user={id:uid,email:'member@example.invalid',email_confirmed_at:'2026-01-01',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},identities:[]};
   const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp},'TEST'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
   let verified=false,updated=0;
   await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{
    const r=route.request(),p=new URL(r.url()).pathname;
    if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT'}});
    let body={},status=200;calls.push({path:p,method:r.method()});
    if(p==='/auth/v1/verify'){
     const data=r.postDataJSON();assert.equal(data.type,'recovery');
     if(mode==='expired'||data.token==='000000'){status=403;body={msg:'Token expired',code:'otp_expired'};}
     else{verified=true;body={access_token:jwt,refresh_token:'FIXTURE',expires_in:3600,expires_at:exp,token_type:'bearer',user};}
    }else if(p==='/auth/v1/user'){
     assert(verified);
     if(r.method()==='PUT'){assert.equal(r.postDataJSON().password,'NewPassphrase_42');updated++;}
     body=user;
    }else if(p==='/auth/v1/logout')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});
    await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
   });
   await page.addInitScript(()=>localStorage.setItem('budget-keep','existing-budget'));
   await page.goto(origin+'/clair/reset.html'+(mode==='code'?'':'#token_hash='+('a'.repeat(64))));
   if(mode==='expired'){
    await page.locator('#reset-error').filter({hasText:'expiré'}).waitFor();assert.equal(updated,0);assert.equal(await page.locator('#password-step').isVisible(),false);
   }else{
    if(mode==='code'){
     await page.locator('#reset-email').fill(user.email);await page.locator('#reset-code').fill('000000');await page.locator('#code-form button').click();await page.locator('#reset-error').filter({hasText:'incorrect'}).waitFor();assert.equal(updated,0);
     await page.locator('#reset-code').fill('123456');await page.locator('#code-form button').click();
    }
    await page.locator('#password-step').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>location.hash),'');assert.equal(await page.locator('#verified-email').innerText(),user.email);
    await page.locator('#new-password').fill('NewPassphrase_42');await page.locator('#confirm-password').fill('DifferentPhrase_42');await page.locator('#password-form button').click();assert.equal(updated,0);assert.match(await page.locator('#reset-error').innerText(),/différents/);
    await page.locator('#confirm-password').fill('NewPassphrase_42');await page.locator('#password-form button').click();await page.locator('#reset-success').waitFor({state:'visible'});await page.waitForFunction(()=>sessionStorage.getItem('clair-assisted-recovery-session-v1')===null);
    assert.equal(updated,1);assert.equal(await page.locator('#new-password').inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('budget-keep')),'existing-budget');assert(calls.some(c=>c.path==='/auth/v1/logout'));
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);await context.close();
   console.log('PASS assisted recovery browser '+mode+': verified identity, invalid/expired rejection, matching password, single update, credential URL cleanup and preserved budget');
  }
  console.log('PASS legacy recovery token/code pages; device-bound support request is covered by verify-device-unlock.cjs');
 }finally{await browser.close();}
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1});
