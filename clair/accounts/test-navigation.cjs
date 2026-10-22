const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const nodes=new Map(),storage=new Map(),events={};
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,values:{},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},scrollIntoView(){},focus(){}});return nodes.get(selector);};
class FormDataMock{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}}
const sandbox={Intl,Date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto:require('node:crypto').webcrypto,console,AbortController,FormData:FormDataMock,setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{protocol:'https:',href:'https://example.test/clair/'},navigator:{userAgent:'test'},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn;}}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.scrollTo=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
let ui=scripts[3],boot=ui.indexOf('  render();if(!cloud.enabled)catchUp();');assert.ok(boot>0);
ui=ui.slice(0,boot)+`window.test={switchPage,rules,budget,startCharge,chargeView,openRule,beginSetup,wizardView,collectWizard,
getPage(){return page;},getCharge(){return chargeDraft;},getWizard(){return wizard;},getModal(){return modal;},getData(){return data;},
setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot);},setWizard(w){wizard=w;}};})();`;
vm.runInContext(ui,sandbox);const t=sandbox.test,E=sandbox.ClairEngine,d=E.empty();d.initialized=true;d.setupDone=true;d.openingCents=100000;d.openingBalanceDate=E.today();t.setData(d);
const click=(action,extra={})=>events.click({target:{closest:()=>({dataset:{action,...extra}})}});
const form=(selector,values)=>{node(selector).values=values;};
const change=kind=>events.change({target:{id:'rule-kind',value:kind,dataset:{},matches:()=>false}});
(async()=>{
 for(const origin of ['settings','home','journal'])for(const destination of ['rules','budget']){
   t.switchPage(origin);t.switchPage(destination);
   assert.match(node('#page').innerHTML,/data-action="page-back"/);
   await click('page-back');assert.equal(t.getPage(),origin);
 }
 t.switchPage('settings');t.switchPage('rules');t.switchPage('rules');await click('page-back');assert.equal(t.getPage(),'settings');
 console.log('PASS page back returns to the actual origin, including repeated navigation');
 t.startCharge();await click('charge-preset',{index:'1'});
 form('#charge-flow-form',{name:'Netflix personnel',amount:'9,',categoryId:'abonnements'});
 await click('charge-back');assert.equal(t.getCharge().step,0);
 await click('charge-preset',{index:'0'});form('#charge-flow-form',{name:'Loyer',amount:'404',categoryId:'logement'});await click('charge-back');
 await click('charge-preset',{index:'1'});assert.match(node('#dialog').innerHTML,/value="9,"/);assert.match(node('#dialog').innerHTML,/Netflix personnel/);
 t.getCharge().step=2;t.getCharge().amount='9,99';t.chargeView();form('#charge-flow-form',{day:'17',start:E.addDays(E.today(),5)});
 await click('charge-back');assert.equal(t.getCharge().day,'17');assert.equal(t.getCharge().start,E.addDays(E.today(),5));
 await click('charge-back');await click('new-weekly');assert.match(node('#dialog').innerHTML,/data-action="rule-back"/);
 const mealValues={name:'Repas maison',kind:'weekly',categoryId:'alimentation',start:E.addDays(E.today(),3),'day-1':'on','price-1':'','price-2':'4,20','price-0':'0,00'};
 form('#rule-form',mealValues);await click('rule-back');assert.equal(t.getModal().kind,'charge-flow');await click('new-weekly');
 assert.match(node('#dialog').innerHTML,/Repas maison/);assert.match(node('#dialog').innerHTML,/name="day-1" checked/);assert.match(node('#dialog').innerHTML,/name="price-1"[^>]*value=""/);assert.match(node('#dialog').innerHTML,/name="price-2"[^>]*value="4,20"/);
 console.log('PASS amount/date/preset and weekly drafts survive back without validating incomplete inputs');
 form('#rule-form',mealValues);await change('monthly');
 form('#rule-form',{name:'Repas maison',kind:'yearly',categoryId:'alimentation',amount:'12,',day:'19',start:E.addDays(E.today(),3)});await change('yearly');
 form('#rule-form',{name:'Repas maison',kind:'weekly',categoryId:'alimentation',amount:'25,5',day:'20',month:'8',start:E.addDays(E.today(),3)});await change('weekly');
 assert.match(node('#dialog').innerHTML,/name="day-1" checked/);assert.match(node('#dialog').innerHTML,/name="price-1"[^>]*value=""/);
 form('#rule-form',mealValues);await change('monthly');assert.match(node('#dialog').innerHTML,/name="amount"[^>]*value="12,"/);assert.match(node('#dialog').innerHTML,/value="19" selected/);
 form('#rule-form',{name:'Repas maison',kind:'monthly',categoryId:'alimentation',amount:'12,',day:'19',start:E.addDays(E.today(),3)});await click('rule-back');await click('new-weekly');
 form('#rule-form',{name:'Repas maison',kind:'weekly',categoryId:'alimentation',amount:'12,',day:'19',start:E.addDays(E.today(),3)});await change('weekly');
 assert.match(node('#dialog').innerHTML,/name="price-1"[^>]*value=""/);assert.match(node('#dialog').innerHTML,/name="price-2"[^>]*value="4,20"/);
 console.log('PASS frequency changes and choice round trips preserve separate weekly, monthly and yearly drafts');
 const before=JSON.stringify(t.getData());
 t.setWizard({step:1,existing:true,balance:'1000,00',start:E.addDays(E.today(),1),days:[0,300,300,300,300,300,0],meals:true,charges:[]});
 form('#wizard-form',{meals:'on',start:E.addDays(E.today(),2),'day-1':'on','price-1':'','price-2':'5,50','price-0':'0,00'});
 await click('wizard-back');assert.equal(t.getWizard().step,0);t.getWizard().step=1;t.wizardView();assert.match(node('#dialog').innerHTML,/name="price-1"[^>]*value=""/);assert.match(node('#dialog').innerHTML,/name="price-2"[^>]*value="5,50"/);
 assert.throws(()=>t.collectWizard(),/montant|somme|supérieur|nombre|valide/i);
 assert.equal(JSON.stringify(t.getData()),before);
 console.log('PASS setup back accepts incomplete fields, forward still validates, and navigation never creates a rule or debit');
})().catch(error=>{console.error(error);process.exitCode=1;});
