function runTests(){
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),storage=new Map(),events={},closeTasks=[];
// Native dialog.close() removes open now, then dispatches close in a later task.
const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,content:'',listeners:{},showCount:0,showModal(){this.open=true;this.showCount++;},close(){if(this.open){this.open=false;closeTasks.push(()=>this.listeners.close?.());}},addEventListener(type,fn){this.listeners[type]=fn;},scrollIntoView(){},focus(){}});return nodes.get(s);};
const flushClose=()=>{while(closeTasks.length)closeTasks.shift()();};
const click=(action,extra={})=>events.click({target:{closest:()=>({dataset:{action,...extra}})}});
let payloads=[],notifications=[],fetched=[];
const sandbox={Intl,Date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{protocol:'https:',href:'https://example.test/clair/'},navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn;}},btoa:text=>Buffer.from(text,'binary').toString('base64'),fetch:async url=>{fetched.push(String(url));return {ok:true,text:async()=>html,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
let ui=scripts[3];const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert.ok(boot>0);
ui=ui.slice(0,boot)+`
download=(body,name,mime)=>window.captureDownload(body,name,mime);
notify=message=>window.captureNotify(message);
window.test={settings,startCharge,chargeView,collectCharge,submitCharge,payCard,paymentDetails,pay,installClair,downloadClair,
 setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot);},
 getData(){return data;},draft(){return chargeDraft;},setDraft(d){chargeDraft=d;},modal(){return modal;},
 setPrompt(p){installPrompt=p;},busy(){return {installBusy,downloadBusy};}};
})();`;
sandbox.captureDownload=(body,name,mime)=>payloads.push({body,name,mime});sandbox.captureNotify=message=>notifications.push(message);
vm.runInContext(ui,sandbox);
const E=sandbox.ClairEngine,t=sandbox.test,d=E.empty(),today=E.today();d.initialized=true;d.setupDone=true;d.openingCents=100000;d.openingBalanceDate=today;t.setData(d);
const form=o=>({get:k=>o[k]??null});
(async()=>{
 let settings=t.settings();
 assert.match(settings,/Installer Clair/);assert.match(settings,/Télécharger le fichier/);assert.match(settings,/<details class="card settings-advanced">/);assert.doesNotMatch(settings,/href="clair.html"/);
 assert.match(settings,/Pour recevoir aussi une notification/);assert.match(settings,/data-import/);assert.match(settings,/data-action="export"/);
 console.log('PASS settings: installation, separate backup/import, collapsed advanced actions, honest reminder status');
 t.startCharge();assert.match(node('#dialog').innerHTML,/Netflix/);
 t.setDraft({step:1,name:'Netflix',amount:'',categoryId:'abonnements',day:'last',start:E.addDays(today,1)});
 assert.throws(()=>t.submitCharge(form({name:'Netflix',amount:'-1'})),/supérieur/);
 t.submitCharge(form({name:'Netflix & famille',amount:'9,99',categoryId:'abonnements'}));
 assert.equal(t.draft().step,2);assert.match(node('#dialog').innerHTML,/date-grid/);assert.match(node('#dialog').innerHTML,/Netflix &amp; famille/);
 const day=Number(E.addDays(today,2).slice(-2));
 t.submitCharge(form({day:String(day),start:E.addDays(today,1)}));
 assert.equal(t.getData().rules.length,1);assert.equal(t.getData().rules[0].amountCents,999);assert.equal(E.balance(t.getData()),100000);
 console.log('PASS guided charge: bad amount blocked, French decimal saved, future rule does not debit early');
 flushClose();
 const unpaid=structuredClone(t.getData()),occurrence=E.upcoming(t.getData(),today)[0],card=t.payCard(occurrence);
 assert.match(card,/data-action="payment-detail"/);assert.doesNotMatch(card,/data-action="pay"/);
 for(let attempt=0;attempt<3;attempt++){
   t.setData(structuredClone(unpaid));
   await click('payment-detail',{key:occurrence.autoKey});assert.match(node('#dialog').innerHTML,/Noter un paiement anticipé/);
   const shown=node('#dialog').showCount;
   await click('pay',{key:occurrence.autoKey});flushClose();
   assert.match(node('#dialog').innerHTML,/ne sera pas comptée une deuxième fois/);
   assert.equal(t.modal()?.kind,'confirm','The confirmation must survive delayed native close events');
   assert.equal(node('#dialog').open,true);assert.equal(node('#dialog').showCount,shown,'Replace the open payment sheet without closing and reopening it');
   assert.equal(E.balance(t.getData()),100000);
   await click('confirm');await click('confirm');flushClose();
   assert.equal(node('#dialog').open,false);assert.equal(t.modal(),null);
   assert.equal(E.balance(t.getData()),99001);
   assert.equal(t.getData().transactions.filter(x=>x.autoKey===occurrence.autoKey).length,1);
   for(let repeat=0;repeat<10;repeat++)E.sync(t.getData(),occurrence.dueDate);
   assert.equal(E.balance(t.getData(),occurrence.dueDate),99001);
 }
 console.log('PASS full early-payment click path repeated 3 times, double confirmation, and 10 due-date syncs without duplicate debit');
 t.setData(structuredClone(unpaid));
 await click('payment-detail',{key:occurrence.autoKey});await click('pay',{key:occurrence.autoKey});await click('close');
 assert.equal(E.balance(t.getData()),100000);assert.equal(t.getData().transactions.length,0);
 // Reopen before the preceding close event has run, as rapid taps can do.
 await click('payment-detail',{key:occurrence.autoKey});await click('pay',{key:occurrence.autoKey});flushClose();
 assert.equal(t.modal().kind,'confirm');await click('confirm');flushClose();assert.equal(E.balance(t.getData()),99001);
 console.log('PASS cancel has no debit; immediate reopen survives the preceding delayed close event');
 await click('new-rule');await click('close');await click('edit-rule',{id:unpaid.rules[0].id});flushClose();
 assert.equal(node('#dialog').open,true);assert.equal(t.modal().kind,'rule');assert.equal(t.modal().id,unpaid.rules[0].id);
 // Escape/browser-native close must still clear the state when it stays closed.
 node('#dialog').close();flushClose();assert.equal(t.modal(),null);
 console.log('PASS shared rule form keeps its state after reopening, and native close clears it');
 const due=structuredClone(unpaid);due.rules[0].start=today;due.rules[0].day=Number(today.slice(-2));E.sync(due,today);
 t.setData(due);const dueKey=due.transactions[0].autoKey,alreadyCounted=E.balance(t.getData());
 assert(!E.upcoming(t.getData(),today).some(x=>x.autoKey===dueKey),'Debited payment disappears without confirmation');
 assert.equal(E.upcoming(t.getData(),today).find(x=>x.ruleId===due.rules[0].id).dueDate.slice(0,7),E.monthOffset(today.slice(0,7),1));
 await click('payment-detail',{key:dueKey});await click('pay',{key:dueKey});flushClose();
 assert.equal(E.balance(t.getData()),alreadyCounted);assert.equal(t.getData().transactions.length,1);assert.equal(t.getData().transactions[0].paymentConfirmed,false);
 console.log('PASS counted payment remains in history and disappears from upcoming without confirmation or another debit');
 t.setData(structuredClone(unpaid));await click('payment-detail',{key:occurrence.autoKey});await click('pay',{key:occurrence.autoKey});
 const normalSave=sandbox.localStorage.setItem;
 sandbox.localStorage.setItem=()=>{const error=new Error('Storage quota exceeded');error.name='QuotaExceededError';throw error;};
 await click('confirm');flushClose();sandbox.localStorage.setItem=normalSave;
 assert.equal(E.balance(t.getData()),100000);assert.equal(t.getData().transactions.length,0);
 assert.match(node('#alert').innerHTML,/La modification n’a pas été enregistrée/);
 await click('payment-detail',{key:occurrence.autoKey});await click('pay',{key:occurrence.autoKey});await click('confirm');flushClose();
 assert.equal(E.balance(t.getData()),99001);assert.equal(t.getData().transactions.length,1);
 console.log('PASS storage failure rolls back the payment, reports the error, and a new attempt records it once');
 await t.downloadClair();assert.equal(payloads.length,1);assert.equal(payloads[0].name,'Clair.html');assert.ok(payloads[0].body.includes('root.ClairEngine ='));
 assert.ok(!payloads[0].body.includes('Netflix & famille'));assert.ok(!payloads[0].body.includes('<link rel="manifest"'));
 assert.equal(fetched[0],'https://example.test/clair/index.html');assert.equal(t.busy().downloadBusy,false);
 assert.equal(fetched.length,7);assert.equal(new Set(fetched).size,7);assert.match(payloads[0].body,/url\('data:image\/webp;base64,/);assert.match(payloads[0].body,/url\('data:image\/png;base64,/);assert.doesNotMatch(payloads[0].body,/url\('assets\/mascotte\//);
 console.log('PASS download embeds six visual assets without the user ledger');
 await t.installClair();assert.match(node('#dialog').innerHTML,/Safari/);
 let prompts=0;t.setPrompt({prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'dismissed'})});await t.installClair();assert.equal(prompts,1);assert.equal(t.busy().installBusy,false);
 console.log('PASS iPhone install guidance and native prompt dismissal');
 for(const script of scripts)new Function(script);
 console.log('ALL CHECKS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1;});
}
runTests();
