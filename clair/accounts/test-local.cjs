function runTests(){
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),storage=new Map(),events={};
const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,content:'',showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},scrollIntoView(){},focus(){}});return nodes.get(s);};
let payloads=[],notifications=[],fetched=[];
const sandbox={Intl,Date,TextEncoder,URL,Blob,structuredClone,crypto,console,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{protocol:'https:',href:'https://example.test/clair/'},navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn;}},fetch:async url=>{fetched.push(String(url));return {ok:true,text:async()=>html};}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
let ui=scripts[3];const boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert.ok(boot>0);
ui=ui.slice(0,boot)+`
download=(body,name,mime)=>window.captureDownload(body,name,mime);
notify=message=>window.captureNotify(message);
window.test={settings,startCharge,chargeView,collectCharge,submitCharge,payCard,paymentDetails,pay,installClair,downloadClair,
 setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot);},
 getData(){return data;},draft(){return chargeDraft;},setDraft(d){chargeDraft=d;},
 setPrompt(p){installPrompt=p;},busy(){return {installBusy,downloadBusy};}};
})();`;
sandbox.captureDownload=(body,name,mime)=>payloads.push({body,name,mime});sandbox.captureNotify=message=>notifications.push(message);
vm.runInContext(ui,sandbox);
const E=sandbox.ClairEngine,t=sandbox.test,d=E.empty(),today=E.today();d.initialized=true;d.setupDone=true;d.openingCents=100000;d.openingBalanceDate=today;t.setData(d);
const form=o=>({get:k=>o[k]??null});
(async()=>{
 let settings=t.settings();
 assert.match(settings,/Installer Clair/);assert.match(settings,/Télécharger le fichier/);assert.match(settings,/<details class="card settings-advanced">/);assert.doesNotMatch(settings,/href="clair.html"/);
 assert.match(settings,/Notifications app fermée : pas encore disponibles/);assert.match(settings,/data-import/);assert.match(settings,/data-action="export"/);
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
 const occurrence=E.upcoming(t.getData(),today)[0],card=t.payCard(occurrence);
 assert.match(card,/data-action="payment-detail"/);assert.doesNotMatch(card,/data-action="pay"/);
 t.paymentDetails(occurrence.autoKey);assert.match(node('#dialog').innerHTML,/Noter un paiement anticipé/);
 t.pay(occurrence.autoKey);assert.match(node('#dialog').innerHTML,/ne sera pas comptée une deuxième fois/);
 events.click({target:{closest:()=>({dataset:{action:'confirm'}})}});
 assert.equal(E.balance(t.getData()),99001);E.sync(t.getData(),occurrence.dueDate);assert.equal(E.balance(t.getData(),occurrence.dueDate),99001);
 console.log('PASS card details, early payment confirmation, no duplicate deduction at due date');
 await t.downloadClair();assert.equal(payloads.length,1);assert.equal(payloads[0].name,'Clair.html');assert.ok(payloads[0].body.includes('root.ClairEngine ='));
 assert.ok(!payloads[0].body.includes('Netflix & famille'));assert.ok(!payloads[0].body.includes('<link rel="manifest"'));
 assert.equal(fetched[0],'https://example.test/clair/index.html');assert.equal(t.busy().downloadBusy,false);
 console.log('PASS download uses clean app source, excludes user ledger and fixes old broken link');
 await t.installClair();assert.match(node('#dialog').innerHTML,/Safari/);
 let prompts=0;t.setPrompt({prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'dismissed'})});await t.installClair();assert.equal(prompts,1);assert.equal(t.busy().installBusy,false);
 console.log('PASS iPhone install guidance and native prompt dismissal');
 for(const script of scripts)new Function(script);
 console.log('ALL CHECKS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1;});
}
runTests();

