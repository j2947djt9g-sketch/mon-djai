// Synthetic local fixtures; no accounts or external requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync('clair/ui/page-host.js','utf8'),context);
let mounts=0,updates=0,disposals=0;
const host=context.createPageHost();
const view={mount(){mounts++;},update(){updates++;},dispose(){disposals++;}};
host.show({},view,{owner:'a',page:'journal',inputs:'one'});
host.show({},view,{owner:'a',page:'journal',inputs:'one'});
assert.equal(mounts,1);assert.equal(updates,0);
host.show({},view,{owner:'a',page:'journal',inputs:'two'});assert.equal(updates,1);
host.show({},view,{owner:'b',page:'journal',inputs:'two'});assert.equal(disposals,1);assert.equal(mounts,2);
host.dispose();host.dispose();assert.equal(disposals,2);
console.log('PASS current page host no-op/update/owner/disposal');

// The served fixture adds a closure bridge to the generated HTML, never production.
(async()=>{
 const path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
 const root=path.resolve(__dirname,'..');
 const bridge=`window.__lifecycle={render,cloud,session:budgetSession,month:m=>{month=m;render()},openTx,startCharge,
 state:()=>({journal:{...journalState},feedback:journalFeedback,timer:journalFeedbackTimer,trail:[...pageTrail],charge:chargeDraft,wizard,modal}),
 feedback:rememberJournalEntry,setBusy:value=>{installBusy=value;pushBusy=value;render()},
 ack:()=>cloud.hooks.apply(E.normalize(data),JSON.stringify({...E.normalize(data),_cloud:{revision:200}}),budgetSession.getContext()),
 edit:()=>{const next=budgetSession.getSnapshot();next.transactions[0].amountCents+=100;cloud.hooks.apply(next,JSON.stringify(next),budgetSession.getContext())},
 owner:id=>{cloud.enabled=true;cloud.client={auth:{}};cloud.user={id,email:id+'@example.test'};cloud.ready=true;cloud.status='synced';cloud.sync=async()=>{};cloud.epoch++;cloud.hooks.enter(cloud.user,{payload:budgetSession.getSnapshot()});render()},
 leave:()=>{cloud.user=null;cloud.epoch++;cloud.hooks.leave();render()},
 recovery:value=>{accountResetStep=value;render()}};`;
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{let bytes=fs.readFileSync(file);if(file.endsWith('/index.html'))bytes=Buffer.from((process.env.CLAIR_LIFECYCLE_HTML?fs.readFileSync(process.env.CLAIR_LIFECYCLE_HTML,'utf8'):bytes.toString()).replace('  render();if(!cloud.enabled)catchUp();',bridge+'  render();if(!cloud.enabled)catchUp();'));res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[path.extname(file)]||'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CLAIR_CHROME_PATH?{executablePath:process.env.CLAIR_CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),errors=[],outside=[];
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();outside.push(route.request().url());return route.abort()});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-11-14T12:00:00Z')});
 await page.addInitScript(()=>{
  window.CLAIR_ACCOUNT_CONFIG=null;
  localStorage.setItem('clair-welcome-seen-v1','1');sessionStorage.setItem('clair-splash-v2','1');
  localStorage.setItem('clair-github-money-v3',JSON.stringify({version:3,currency:'EUR',initialized:true,setupDone:true,openingCents:100000,openingBalanceDate:'2026-11-01',transactions:[{id:'demo',type:'expense',amountCents:1200,date:'2026-11-14',name:'Repas fictif',categoryId:'autre'},{id:'other',type:'income',amountCents:5000,date:'2026-11-14',name:'Revenu fictif',categoryId:'income'}],rules:[],fixedExpenses:[],preferences:{reminders:false}}));
  const active=new Set(),originalAdd=EventTarget.prototype.addEventListener,originalRemove=EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener=function(type,fn,options){if(![...active].some(x=>x.target===this&&x.type===type&&x.fn===fn))active.add({target:this,type,fn});return originalAdd.call(this,type,fn,options)};
  EventTarget.prototype.removeEventListener=function(type,fn,options){for(const x of active)if(x.target===this&&x.type===type&&x.fn===fn)active.delete(x);return originalRemove.call(this,type,fn,options)};
  const observers=new Set(),NativeObserver=window.ResizeObserver;window.ResizeObserver=class extends NativeObserver{constructor(callback){super(callback);observers.add(this)}disconnect(){observers.delete(this);return super.disconnect()}};window.__observers=()=>observers.size;
  window.__listeners=()=>[...active].filter(x=>x.target===window||x.target===document||x.target instanceof MediaQueryList||x.target.isConnected).length;
 });
 await page.goto(origin+'/index.html');await page.locator('.balance-section').waitFor();
 await page.evaluate(()=>{window.desktop=document.querySelector('.nav [data-nav="journal"]')});
 await page.locator('.nav [data-nav="journal"]').focus();await page.keyboard.press('Enter');
 assert(await page.evaluate(()=>desktop===document.activeElement&&desktop===document.querySelector('.nav [data-nav="journal"]')&&desktop.getAttribute('aria-current')==='page'));
 await page.locator('#search').fill('Repas');await page.locator('#search').focus();
 await page.evaluate(()=>{const input=document.querySelector('#search');input.setSelectionRange(1,3);document.querySelector('#journal-more').open=true;window.search=input;window.row=document.querySelector('#journal-results .row');window.scrollTo(0,100);window.scrollBefore=scrollY;});
 await page.evaluate(()=>{__lifecycle.ack();for(let i=0;i<10;i++)document.dispatchEvent(new Event('visibilitychange'))});
 assert(await page.evaluate(()=>search===document.activeElement&&search===document.querySelector('#search')&&search.value==='Repas'&&search.selectionStart===1&&search.selectionEnd===3&&document.querySelector('#journal-more').open&&row===document.querySelector('#journal-results .row')&&scrollBefore===scrollY));
 const summary=await page.locator('#journal-summary').innerText();await page.evaluate(()=>__lifecycle.edit());assert.notEqual(await page.locator('#journal-summary').innerText(),summary);
 assert(await page.evaluate(()=>search===document.querySelector('#search')&&search.value==='Repas'&&search.selectionStart===1));
 await page.locator('#search').fill('');await page.evaluate(()=>{window.otherRow=document.querySelector('#journal-results [data-id="other"]').closest('.row');__lifecycle.edit()});
 assert(await page.evaluate(()=>otherRow===document.querySelector('#journal-results [data-id="other"]').closest('.row')));
 await page.evaluate(()=>__lifecycle.month('2026-10'));assert.equal(await page.locator('#journal-results .row').count(),0);await page.evaluate(()=>__lifecycle.month('2026-11'));assert.equal(await page.locator('#journal-results .row').count(),2);
 await page.locator('.nav [data-nav="home"]').click();const date=await page.locator('#today-label').innerText();await page.clock.fastForward(12*60*60*1000);assert.notEqual(await page.locator('#today-label').innerText(),date);
 await page.locator('.nav [data-nav="settings"]').click();await page.locator('.install-card details').evaluate(node=>node.open=true);await page.evaluate(()=>__lifecycle.setBusy(true));assert.equal(await page.locator('[data-action="install"]').isDisabled(),true);assert.equal(await page.locator('.install-card details').evaluate(node=>node.open),true);await page.evaluate(()=>__lifecycle.setBusy(false));
 await page.evaluate(()=>__lifecycle.owner('owner-a'));await page.locator('.nav [data-nav="journal"]').click();await page.locator('#search').fill('private query');await page.locator('#journal-more').evaluate(node=>node.open=true);
 await page.evaluate(()=>{__lifecycle.feedback('demo');__lifecycle.startCharge()});await page.evaluate(()=>__lifecycle.ack());assert.equal(await page.locator('#dialog').evaluate(node=>node.open),true);
 await page.evaluate(()=>__lifecycle.owner('owner-b'));assert(await page.evaluate(()=>{const s=__lifecycle.state();return s.journal.query===''&&!s.journal.more&&s.feedback===null&&s.timer===null&&s.trail.length===0&&s.charge===null&&s.modal===null}));
 await page.locator('.nav [data-nav="journal"]').click();assert.equal(await page.locator('#search').inputValue(),'');
 await page.evaluate(()=>__lifecycle.recovery('email'));await page.locator('#account-forgot-form').waitFor();await page.evaluate(()=>__lifecycle.recovery(null));await page.locator('#search').waitFor();
 await page.locator('.profile-button').click();await page.evaluate(()=>{__lifecycle.cloud.displayName='Prénom fictif';__lifecycle.cloud.user.email='new@example.test';__lifecycle.cloud.hooks.status()});assert.match(await page.locator('.profile-person').innerText(),/Prénom fictif/);assert.match(await page.locator('.profile-email').innerText(),/new@example.test/);await page.locator('.nav [data-nav="journal"]').click();
 const listeners=await page.evaluate(()=>__listeners()),observers=await page.evaluate(()=>__observers());
 for(let i=0;i<12;i++){await page.locator('.nav [data-nav="home"]').click();await page.locator('.nav [data-nav="journal"]').click()}
 assert.equal(await page.evaluate(()=>__listeners()),listeners);assert.equal(await page.evaluate(()=>__observers()),observers);
 for(let i=0;i<8;i++){await page.evaluate(()=>{__lifecycle.leave();__lifecycle.owner('owner-b')})}
 await page.locator('.nav [data-nav="journal"]').click();assert.equal(await page.evaluate(()=>__listeners()),listeners);assert.equal(await page.evaluate(()=>__observers()),observers);
 await page.evaluate(()=>__lifecycle.leave());await page.locator('#account-form').waitFor();assert.equal(await page.locator('#search').count(),0);assert.equal(await page.locator('.bottom-nav button').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);await context.close();
 console.log('PASS browser lifecycle: keyboard/no-op ACK/typing/selection/details/scroll/edit/row reuse/month/Paris day/settings/owner purge/recovery/logout/rapid navigation/listeners');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
