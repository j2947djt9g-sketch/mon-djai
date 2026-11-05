// Real Express fragment + Clair commit path; storage and DOM are isolated test fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);

function fixture(){
 const storage=new Map(),nodes=new Map(),events={},notifications=[],closed=[];let failWrites=false;
 const node=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},disabled:false,hidden:false,open:false,
   classList:{add(){},remove(){},toggle(){}},listeners:{},showModal(){this.open=true;},close(){this.open=false;closed.push(()=>this.listeners.close?.());},
   addEventListener(type,callback){this.listeners[type]=callback;},scrollIntoView(){},focus(){},setAttribute(){},removeAttribute(){},
   querySelector:query=>node(selector+' '+query),querySelectorAll:()=>[],matches:()=>false,contains:()=>true});
  return nodes.get(selector);
 };
 const localStorage={getItem:key=>storage.get(key)??null,setItem(key,value){if(failWrites&&key.startsWith('clair-account-budget-v1-'))throw Error('QuotaExceededError: storage full');storage.set(key,String(value));},removeItem:key=>storage.delete(key)};
 const sandbox={Intl,Date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,
  setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{origin:'https://example.test',protocol:'https:',href:'https://example.test/clair/',pathname:'/clair/'},
  navigator:{onLine:true,userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage,
  document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,callback)=>{events[type]=callback;}},
  FormData:class{constructor(form){this.form=form;}get(key){return this.form.values?.[key]??null;}}};
 sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
 vm.createContext(sandbox);
 vm.runInContext(scripts.find(script=>script.includes('root.ClairEngine =')),sandbox);
 vm.runInContext(scripts.find(script=>script.includes('root.ClairCloud=ClairCloud')),sandbox);
 for(const [file,global] of [['express-core.js','ClairExpressCore'],['express-insights.js','ClairExpressInsights']]){
  if(!sandbox[global]&&fs.existsSync(path.join(__dirname,file)))vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox);
 }
 let ui=scripts.find(script=>script.includes('  render();if(!cloud.enabled)catchUp();'));
 const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 const canonical=path.join(__dirname,'express-ui.js');
 const fragment=!ui.includes('function openExpress(')&&fs.existsSync(canonical)?fs.readFileSync(canonical,'utf8'):'';
 ui=ui.slice(0,boot)+fragment+`
 notify=(message,callback=null,label)=>window.captureNotification(message,callback,label);
 window.test={cloud,commit,close,render,openTx,importFile,
  openExpress:typeof openExpress==='function'?openExpress:null,
  expressAction:typeof expressAction==='function'?expressAction:null,
  expressSubmit:typeof expressSubmit==='function'?expressSubmit:null,
  refresh(){if(typeof expressRefresh==='function')expressRefresh();},
  modal:()=>modal,data:()=>data,key:()=>KEY,recovery:()=>recovery,
  setAccount(uid,next){if(typeof expressReset==='function')expressReset();cloud.enabled=true;cloud.user={id:uid,email:uid+'@example.invalid'};cloud.ready=true;cloud.status='synced';cloud.epoch++;cloud.conflict=null;cloud.record=null;KEY=cloud.key(uid);data=next;snapshot=saveData(data);localStorage.setItem(KEY,snapshot);cloud.record=cloud.decode(snapshot,uid);},
  replace(next){data=next;snapshot=saveData(data);localStorage.setItem(KEY,snapshot);cloud.record=cloud.decode(snapshot,cloud.user.id);},
  logout(){cloud.user=null;cloud.epoch++;cloud.ready=true;cloud.status='signed-out';if(typeof expressRefresh==='function')expressRefresh();},
  external(next){const raw=saveData(next);localStorage.setItem(KEY,raw);},
  snapshot:()=>snapshot};
 })();`;
 sandbox.captureNotification=(message,callback,label)=>notifications.push({message,callback,label});
 vm.runInContext(ui,sandbox);
 const t=sandbox.test,E=sandbox.ClairEngine;
 const budget=(currency='EUR',confirmed=false)=>{const data=E.empty();data.initialized=data.setupDone=true;data.currency=currency;data.openingCents=100000;data.openingBalanceDate=E.today();if(confirmed){data.expressSchema=1;data.preferences.express={defaultAccountId:'current-budget'};}return data;};
 const form=(values={},id='express-form')=>{
  const fields=new Map(),field=name=>{if(!fields.has(name))fields.set(name,{name,get value(){return values[name]??'';},set value(value){values[name]=String(value);},focus(){},setAttribute(){},removeAttribute(){}});return fields.get(name);};
  const result={id,values,dataset:{},closest:selector=>selector==='#dialog'?node('#dialog'):null,
   elements:new Proxy({namedItem:field},{get:(target,key)=>key in target?target[key]:field(key)}),
   querySelector:selector=>{const name=selector.match(/\[name=["']?([^\]"']+)/)?.[1];return name?field(name):node('#'+id+' '+selector);},querySelectorAll:()=>[],reset(){}};
  nodes.set('#'+id,result);return result;
 };
 const requestId=()=>t.modal()?.requestId||node('#dialog').innerHTML.match(/name=["']requestId["'][^>]*value=["']([^"']+)/)?.[1]||node('#dialog').innerHTML.match(/value=["']([^"']+)["'][^>]*name=["']requestId["']/)?.[1]||node('#dialog').innerHTML.match(/data-request-id=["']([^"']+)/)?.[1];
 const action=(name,extra={})=>t.expressAction({dataset:{action:name,requestId:requestId(),...extra},closest:()=>node('#dialog')});
 return {t,E,sandbox,storage,node,notifications,budget,form,requestId,action,events,failWrites:value=>{failWrites=value;},flushClose(){while(closed.length)closed.shift()();}};
}

(async()=>{
 const f=fixture(),{t,storage,budget,node,action}=f;
 assert.equal(typeof t.openExpress,'function','Dépense Express must open a confirmation/amount form in the existing dialog');
 t.setAccount('owner-a',budget());const before=storage.get(t.key());
 t.openExpress();assert.equal(t.modal()?.kind,'express');assert.equal(node('#dialog').open,true);
 assert.match(node('#dialog').innerHTML,/express-confirm-account/);
 assert.equal(storage.get(t.key()),before,'Opening Express must not confirm or save a default account');
 assert.equal(t.data().preferences.express,undefined);
 await action('express-confirm-account');
 assert.equal(t.data().preferences.express.defaultAccountId,'current-budget');
 assert.equal(t.data().transactions.length,0,'Confirming the current Clair budget never creates a payment');
 assert.match(node('#dialog').innerHTML,/id=["']express-form["']/);
 console.log('PASS Express: explicit first default-budget confirmation only');

 // A raw decimal must reach the real engine parser, and the consumed form cannot debit twice.
 for(const [currency,raw,cents] of [['EUR','0,50',50],['EUR','3',300],['EUR','25',2500],['USD','3.25',325],['GBP','3,25',325],['XOF','25',2500],['XAF','3',300]]){
  const g=fixture();assert.equal(typeof g.t.openExpress,'function');g.t.setAccount('amount-'+currency,g.budget(currency,true));
  g.t.openExpress();const ticket=g.requestId();assert(ticket,'Each opening needs a stable request ticket');
  const entry=g.form({amount:raw,categoryId:'non-classee',requestId:ticket});await g.t.expressSubmit(entry);await g.t.expressSubmit(entry);
  assert.equal(g.t.data().transactions.length,1,'Repeated Enter/click must add exactly one transaction');
  const tx=g.t.data().transactions[0];assert.equal(tx.amountCents,cents);assert.equal(tx.type,'expense');assert.equal(tx.name,'Dépense Express');
  assert.equal(tx.express.source,'express');assert.equal(tx.express.originalCurrency,currency);assert.equal(tx.express.accountId,'current-budget');
  assert.equal(tx.date,g.E.dateAt(tx.express.createdAt));assert.equal(g.E.balance(g.t.data()),100000-cents);
  assert.equal(JSON.parse(g.storage.get(g.t.key())).transactions.length,1);
 }
 console.log('PASS Express: 0.50/3/25 EUR, USD/GBP decimals, whole XOF/XAF, metadata and no double debit');

 for(const [currency,raw] of [['EUR',''],['EUR','0'],['EUR','-1'],['EUR','3,2,5'],['EUR','3.25x'],['EUR','1e2'],['EUR','0x10'],['EUR','Infinity'],['EUR','100000000.01'],['XOF','0,50'],['XAF','3.25']]){
  const g=fixture();g.t.setAccount('invalid',g.budget(currency,true));g.t.openExpress();const ticket=g.requestId(),before=g.storage.get(g.t.key());
  const entry=g.form({amount:raw,categoryId:'non-classee',requestId:ticket});try{await g.t.expressSubmit(entry);}catch{}
  assert.equal(g.t.data().transactions.length,0,`Invalid ${currency} amount ${JSON.stringify(raw)} must not create a payment`);
  assert.equal(g.storage.get(g.t.key()),before);assert.equal(g.requestId(),ticket,'Validation failure must preserve the stable retry ticket');
  entry.values.amount=currency.startsWith('X')?'3':'0,50';await g.t.expressSubmit(entry);assert.equal(g.t.data().transactions.length,1,'A valid retry reuses the failed ticket');
 }
 console.log('PASS Express: malformed/zero/negative/overflow/fractional CFA amounts rejected; valid retry keeps the ticket');

 const quota=fixture();quota.t.setAccount('quota',quota.budget('EUR',true));quota.t.openExpress();const ticket=quota.requestId();
 const entry=quota.form({amount:'3,25',categoryId:'non-classee',requestId:ticket});quota.failWrites(true);await quota.t.expressSubmit(entry);
 assert.equal(quota.t.data().transactions.length,0);assert.equal(quota.requestId(),ticket);assert.equal(entry.values.amount,'3,25');
 assert.equal(quota.t.recovery().transactions[0].amountCents,325,'The attempted payment remains available in the recovery copy');
 quota.failWrites(false);await quota.t.expressSubmit(entry);await quota.t.expressSubmit(entry);
 assert.equal(quota.t.data().transactions.length,1);assert.equal(quota.t.data().transactions[0].amountCents,325);
 console.log('PASS Express: failed local save keeps draft/recovery and retry produces one debit');

 const owner=fixture();owner.t.setAccount('owner-a',owner.budget('EUR',true));owner.t.openExpress();
 const old=owner.form({amount:'25',categoryId:'non-classee',requestId:owner.requestId()}),aKey=owner.t.key(),aBefore=owner.storage.get(aKey);
 owner.t.setAccount('owner-b',owner.budget('EUR',true));const bBefore=owner.storage.get(owner.t.key());try{await owner.t.expressSubmit(old);}catch{}
 assert.equal(owner.storage.get(aKey),aBefore);assert.equal(owner.storage.get(owner.t.key()),bBefore);assert.equal(owner.t.data().transactions.length,0);
 owner.t.openExpress();const loggedOut=owner.form({amount:'3',categoryId:'non-classee',requestId:owner.requestId()});owner.t.logout();try{await owner.t.expressSubmit(loggedOut);}catch{}
 assert.equal(owner.t.data().transactions.length,0);assert.equal(owner.storage.get(aKey),aBefore);
 console.log('PASS Express: stale account-A and signed-out forms cannot write either account');

 const changed=fixture();changed.t.setAccount('changed',changed.budget('EUR',true));changed.t.openExpress();
 const stale=changed.form({amount:'3',categoryId:'non-classee',requestId:changed.requestId()}),external=structuredClone(changed.t.data());external.openingCents=200000;changed.t.external(external);
 try{await changed.t.expressSubmit(stale);}catch{}
 assert.equal(changed.t.data().transactions.length,0);assert.equal(JSON.parse(changed.storage.get(changed.t.key())).openingCents,200000);
 console.log('PASS Express: inter-tab storage change cannot be overwritten by a stale amount form');
 for(const mode of ['currency','payload','ack']){
  const g=fixture();g.t.setAccount('refresh',g.budget('EUR',true));g.t.openExpress();
  const entry=g.form({amount:'3',categoryId:'non-classee',requestId:g.requestId()}),next=structuredClone(g.t.data());
  if(mode==='currency'){next.currency='USD';next.currencyRevision=1;}
  if(mode==='payload')next.openingCents+=100;
  if(mode==='ack')next._cloud={userId:'refresh',revision:2,dirty:false,operationId:'metadata-ack'};
  g.t.replace(next);g.t.refresh();await g.t.expressSubmit(entry);
  assert.equal(g.t.data().transactions.length,mode==='ack'?1:0,mode+' refresh must distinguish payload changes from metadata-only ACK');
 }
 console.log('PASS Express: currency and real payload changes invalidate; metadata-only ACK retains the draft');

 for(const mode of ['edit','delete','switch']){
  const g=fixture();g.t.setAccount('correct-a',g.budget('EUR',true));g.t.openExpress();
  await g.t.expressSubmit(g.form({amount:'3',categoryId:'non-classee',requestId:g.requestId()}));
  const correction=g.notifications.findLast(item=>item.label==='Modifier');assert.equal(typeof correction?.callback,'function');
  const next=structuredClone(g.t.data());if(mode==='edit')next.transactions[0].amountCents=400;if(mode==='delete')next.transactions=[];
  if(mode==='switch')g.t.setAccount('correct-b',g.budget('EUR',true));else g.t.replace(next);
  correction.callback();assert.notEqual(g.t.modal()?.kind,'tx','An old correction action must not open a changed/deleted/other-owner transaction');
  assert.equal(g.t.data().transactions.length,mode==='edit'?1:0,'Stale correction must never resurrect a transaction');
 }
 console.log('PASS Express: stale correction after edit, deletion or owner switch cannot write or resurrect');
 for(const timing of ['read','confirm']){
  const g=fixture();g.t.setAccount('import-a',g.budget('EUR',true));const aKey=g.t.key(),aBefore=g.storage.get(aKey);
  let release;const pending=new Promise(resolve=>release=resolve),file={size:100,text:()=>pending};const importing=g.t.importFile(file);
  if(timing==='read'){g.t.setAccount('import-b',g.budget('EUR',true));release(JSON.stringify(g.budget()));await importing;assert.notEqual(g.t.modal()?.kind,'confirm');}
  else {release(JSON.stringify(g.budget()));await importing;assert.equal(g.t.modal()?.kind,'confirm');const callback=g.t.modal().callback;g.t.setAccount('import-b',g.budget('EUR',true));callback();}
  assert.equal(g.storage.get(aKey),aBefore);assert.equal(g.t.data().transactions.length,0);assert.equal(g.t.data().preferences.express.defaultAccountId,'current-budget');
 }
 console.log('PASS replacement: owner switch during import read or confirmation cannot replace either budget');
 const futureImport=fixture();futureImport.t.setAccount('future-import',futureImport.budget('EUR',true));
 const futureBefore=futureImport.storage.get(futureImport.t.key()),futurePayload=futureImport.budget();futurePayload.expressSchema=2;
 await futureImport.t.importFile({size:100,text:async()=>JSON.stringify(futurePayload)});
 assert.notEqual(futureImport.t.modal()?.kind,'confirm','An unsupported future schema must never reach import confirmation');
 assert.equal(futureImport.storage.get(futureImport.t.key()),futureBefore,'Rejected future schema must not write the current budget');
 assert.equal(futureImport.t.data().expressSchema,1);assert.equal(futureImport.t.data().transactions.length,0);
 const imported=fixture();imported.t.setAccount('legacy-import',imported.budget('EUR',true));
 await imported.t.importFile({size:100,text:async()=>JSON.stringify(imported.budget())});assert.equal(imported.t.modal()?.kind,'confirm');imported.t.modal().callback();
 assert.equal(imported.t.data().expressSchema,1);assert.equal(imported.t.data().preferences.express,undefined);assert.equal(imported.t.data().transactions.length,0);
 const reset=fixture();reset.t.setAccount('reset',reset.budget('EUR',true));
 const button={dataset:{action:'reset'}};await reset.events.click({target:{closest:()=>button}});
 const resetForm=reset.form({confirmation:'EFFACER'},'reset-form');await reset.events.submit({target:resetForm,preventDefault(){}});
 assert.equal(reset.t.data().expressSchema,1);assert.equal(reset.t.data().preferences.express,undefined);assert.equal(reset.t.data().transactions.length,0);
 const staleReset=fixture();staleReset.t.setAccount('reset-a',staleReset.budget('EUR',true));
 await staleReset.events.click({target:{closest:()=>({dataset:{action:'reset'}})}});
 const resetOld=staleReset.form({confirmation:'EFFACER'},'reset-form');staleReset.t.setAccount('reset-b',staleReset.budget('EUR',true));const resetBefore=staleReset.storage.get(staleReset.t.key());
 await staleReset.events.submit({target:resetOld,preventDefault(){}});assert.equal(staleReset.storage.get(staleReset.t.key()),resetBefore);assert.equal(staleReset.t.data().initialized,true);
 console.log('PASS replacement: legacy import and reset preserve schema capability, remove confirmation and create no expense');
 console.log('ALL EXPRESS UI CHECKS PASSED');
})().catch(error=>{console.error(error);process.exitCode=1;});
