// All sessions and backend data are fixtures. No email, real account or payment is touched.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const name=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',{'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(name)]||'text/plain');res.end(fs.readFileSync(name));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CLAIR_CHROME_PATH});
 try{for(const width of [320,390,768,1440]){
  const uid='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',exp=Math.floor(Date.now()/1000)+3600;
  const user={id:uid,email:'owner@example.invalid',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01',last_sign_in_at:new Date().toISOString(),user_metadata:{},app_metadata:{provider:'email'},identities:[]};
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:uid,aud:'authenticated',role:'authenticated',exp},'TEST'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
  let board={actor:{id:uid,email:user.email},settings:{mode:'free',monthly_cents:199,payment_phone:''},today:'2026-10-23',users:[{id:uid,email:user.email,name:'Owner',confirmed:true,is_admin:true,created_at:'2026-01-01'}, {id:member,email:'member@example.invalid',name:'<img src=x onerror=alert(1)>',confirmed:true,is_admin:false,created_at:'2026-01-02',test_until:'2026-10-25'}],messages:[],audit:[]},mail=null,calls=[];
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://mail.google.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<p>Gmail compose fixture</p>'}));
  await context.route('https://hkssnbvktfscizojhftl.supabase.co/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;let result={};
   if(p==='/auth/v1/user')result=user;
   else if(p==='/functions/v1/clair-masterboard'){
    const input=req.postDataJSON();calls.push(input);
    if(input.action==='snapshot')result=board;
    else if(input.action==='prepare-mail'){mail={id:input.id,user_id:member,email:'member@example.invalid',subject:'[TEST] Clair — rappel d’abonnement à 1,99 €',body:'Ceci est un test. Aucun paiement n’est dû.\nNe transfère pas d’argent.',kind:input.kind,state:'prepared'};board.messages=[{...mail,created_at:'2026-10-23T12:00:00Z'}];result={message:mail};}
    else if(input.action==='mail-opened'){mail.state='opened';board.messages[0].state='opened';result={ok:true};}
    else if(input.action==='mail-confirm'){mail.state='confirmed_sent';board.messages[0].state='confirmed_sent';result={ok:true};}
    else if(input.action==='get-mail')result={message:mail};
    else if(input.action==='set-test-date'){board.users[1].test_until=input.date;result={ok:true};}
    else if(input.action==='renew-test'){board.users[1].test_until='2026-11-23';result={ok:true,test_until:'2026-11-23'};}
    else if(input.action==='settings'){board.settings.payment_phone=input.payment_phone;result={ok:true};}
   }
   await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
  });
  await page.addInitScript(({user,jwt,exp})=>sessionStorage.setItem('clair-masterboard-session-v1',JSON.stringify({access_token:jwt,refresh_token:'FIXTURE',expires_in:3600,expires_at:exp,token_type:'bearer',user})),{user,jwt,exp});
  await page.goto('http://127.0.0.1:'+server.address().port+'/masterboard/');await page.locator('#board').waitFor({state:'visible'});
  assert.equal(await page.locator('.user-card').count(),2);assert.equal(await page.locator('.user-card img').count(),0);assert.equal(await page.locator('[data-action="delete"]').count(),1);
  const noOverflow=async()=>{
   const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,outliers:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right)})).slice(0,15)}));
   assert(result.scroll<=result.width+1,JSON.stringify(result));
  };await noOverflow();
  await page.locator('[data-tab="settings"]').click();await page.locator('#phone').fill('+33 6 00 00 00 00');await page.locator('#settings-form button').click();await page.getByRole('status').filter({hasText:'Coordonnées de test'}).waitFor();assert.equal(board.settings.mode,'free');
  await page.locator('[data-tab="accounts"]').click();await page.locator('#search').fill('member@');assert.equal(await page.locator('.user-card').count(),1);
  await page.locator('[data-action="date"]').click();await page.locator('[data-offset="-3"]').click();await page.locator('#date-form button[type="submit"]').click();await page.locator('#modal').waitFor({state:'hidden'});assert.equal(board.users[1].test_until,'2026-10-20');assert.match(await page.locator('.user-card').innerText(),/Accès gratuit/);
  await page.locator('[data-action="reminder"]').click();await page.locator('#modal').waitFor({state:'visible'});assert(await page.locator('#confirm-mail').isDisabled());
  const href=await page.getByRole('link',{name:'Ouvrir Gmail et envoyer'}).getAttribute('href'),url=new URL(href);assert.equal(url.hostname,'mail.google.com');assert.equal(url.searchParams.get('to'),'member@example.invalid');assert.match(url.searchParams.get('body'),/Aucun paiement/);assert.equal(calls.filter(c=>/send/.test(c.action)).length,0);
  const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'Ouvrir Gmail et envoyer'}).click();const popup=await popupPromise;await popup.close();await page.locator('#confirm-mail:enabled').waitFor();await page.locator('#confirm-mail').click();await page.locator('#confirm-mail').filter({hasText:'Envoi confirmé'}).waitFor();assert.equal(mail.state,'confirmed_sent');await noOverflow();await page.locator('#close-modal').click();
  await page.locator('[data-action="renew"]').click();await page.locator('#renew-confirm').click();await page.locator('#modal').waitFor({state:'hidden'});assert.equal(board.users[1].test_until,'2026-11-23');
  await page.locator('[data-action="delete"]').click();assert.match(await page.locator('#modal').innerText(),/irréversible/);assert.match(await page.locator('#modal').innerText(),/Cette action est réelle/);assert.equal(await page.locator('#confirm-email').inputValue(),'');await page.locator('#close-modal').click();assert.equal(calls.filter(c=>c.action==='delete').length,0);
  await page.locator('[data-tab="messages"]').click();assert.match(await page.locator('#messages').innerText(),/Envoi confirmé par toi/);await page.locator('[data-action="reopen"]').click();assert(await page.locator('#confirm-mail').isDisabled());await page.locator('#close-modal').click();
  if(process.env.CLAIR_PREVIEW==='1'){await page.locator('[data-tab="accounts"]').click();await page.locator('#search').fill('');await page.screenshot({path:'/tmp/clair-masterboard-'+width+'.png',fullPage:true});}
  await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('#users').innerHTML(),'');assert.deepEqual(errors,[]);await context.close();console.log('PASS masterboard '+width+'px: safe account cards, no overflow, date scenarios, Gmail recipient/body and real compose opening, manual send confirmation, renewal, deletion confirmation without executing it, history and logout');
 }}finally{await browser.close();}
})().then(()=>server.close()).catch(e=>{console.error(e);server.close();process.exitCode=1});
