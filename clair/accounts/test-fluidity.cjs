// Real application handlers with fictional local data; no account or network access.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);

function app(){
 const nodes=new Map(),storage=new Map(),events={};
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',dataset:{},style:{},open:false,hidden:false,attributes:{},fields:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(){},scrollIntoView(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(selector);};
 const sandbox={Intl,Date,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto:require('node:crypto').webcrypto,console,AbortController,FormData:class{constructor(form){this.fields=form.fields;}get(k){return this.fields[k]??null;}},setTimeout:()=>1,clearTimeout(){},setInterval(){},location:{protocol:'file:',href:'file:///clair/index.html'},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener(type,fn){events[type]=fn;}}};
 sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
 const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 vm.runInContext(scripts[3].slice(0,boot)+`window.test={openTx,journalFlow,journalResults,state:journalState,getData:()=>data,getModal:()=>modal,getMonth:()=>month,setPage(p){page=p;},setMonth(m){month=m;},setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot);}};})();`,sandbox);
 const E=sandbox.ClairEngine,t=sandbox.test,d=E.empty();Object.assign(d,{initialized:true,setupDone:true,openingCents:1000000,openingBalanceDate:'2026-10-01'});d.customCategories=[{id:'custom-study',label:'Bourse étudiante',icon:'·'}];
 t.setData(d);t.setMonth('2026-10');t.setPage('journal');
 return {E,t,node,click:(action,extra={})=>events.click({target:{closest:()=>({dataset:{action,...extra}})}}),submit:fields=>events.submit({target:{id:'tx-form',fields,closest:()=>true},preventDefault(){}})};
}

test('Add opens a new expense directly without writing an operation',async()=>{
 const a=app(),before=JSON.stringify(a.t.getData());await a.click('add');
 assert.equal(a.t.getModal()?.kind,'tx','Add must open the transaction form directly');
 assert.equal(a.t.getModal().type,'expense');assert.equal(JSON.stringify(a.t.getData()),before);
});

test('expense and income use the selected type, category and current currency at submit',async()=>{
 for(const [currency,amount,want]of [['EUR','12,50',1250],['USD','12,50',1250],['XOF','1500',150000],['XAF','1500',150000]]){
  const a=app();a.t.getData().currency=currency;await a.click('add');
  await a.submit({amount,date:'2026-10-15',name:'Courses',categoryId:'alimentation',note:'Dépense fictive'});
  assert.equal(a.t.getData().transactions[0]?.type,'expense');assert.equal(a.t.getData().transactions[0].amountCents,want);assert.equal(a.E.balance(a.t.getData()),1000000-want);
  await a.click('add');await a.click('income');
  await a.submit({amount,date:'2026-10-16',name:'Aide études',categoryId:'custom-study',note:'Entrée fictive'});
  const income=a.t.getData().transactions.find(t=>t.name==='Aide études');assert.equal(income?.type,'income');assert.equal(income.categoryId,'custom-study');assert.equal(income.amountCents,want);assert.equal(a.E.balance(a.t.getData()),1000000);
  const saved=a.E.normalize(JSON.parse(JSON.stringify(a.t.getData())));assert.equal(saved.currency,currency);assert.equal(saved.transactions.length,2);
 }
});

test('existing ordinary and automatic corrections keep their original type',async()=>{
 const a=app();a.t.getData().transactions=[{id:'expense',type:'expense',amountCents:3000,date:'2026-10-15',categoryId:'alimentation',name:'Courses'},{id:'income',type:'income',amountCents:500,date:'2026-10-16',categoryId:'custom-study',name:'Bourse'},{id:'auto',type:'expense',amountCents:700,date:'2026-10-15',categoryId:'transport',name:'Trajet',autoKey:'rule:2026-10-15'}];
 for(const id of ['expense','income','auto']){
  const original=a.t.getData().transactions.find(t=>t.id===id);await a.click('edit-tx',{id});
  assert.equal(a.t.getModal().type,original.type);
  assert.doesNotMatch(a.node('#dialog').innerHTML,/data-action="(?:income|expense)"/,'Existing operations must not offer type controls');
  await a.submit({amount:'8,00',date:'2026-10-20',name:original.name,categoryId:original.categoryId,note:'Corrigé'});
  const saved=a.t.getData().transactions.find(t=>t.id===id);assert.equal(saved.type,original.type);assert.equal(saved.amountCents,800);if(id==='auto')assert.equal(saved.date,'2026-10-15');
 }
});

test('incompatible savings filters explain the conflict and recover only the flow',async()=>{
 for(const flow of ['income','expense'])for(const [kind,category,expected]of [['savings','all',['withdraw','deposit']],['all','epargne',['withdraw','deposit']],['manual','epargne',['withdraw','deposit']],['auto','epargne',[]],['savings','telephone',[]]]){
  const a=app(),d=a.t.getData();d.savingsProjects=[{id:'trip',name:'Voyage',kind:'voyage',icon:'plane',color:'violet',targetCents:100000,targetDate:null,archived:false}];
  d.transactions=[{id:'deposit',type:'expense',amountCents:3000,date:'2026-10-15',categoryId:'epargne',savingsProjectId:'trip',name:'Voyage déposé'},{id:'withdraw',type:'income',amountCents:500,date:'2026-10-16',categoryId:'epargne',savingsProjectId:'trip',name:'Voyage retiré'},{id:'phone',type:'expense',amountCents:1000,date:'2026-10-15',categoryId:'telephone',name:'Forfait'}];
  const before=JSON.stringify(d),balance=a.E.balance(d);a.node('#kind-filter').value=kind;a.node('#category-filter').value=category;a.node('#search').value='Voyage';a.t.state.more=true;a.t.journalFlow(flow);
  assert.equal(a.node('#journal-results').hidden,true);
  const hint=a.node('#journal-companion').innerHTML;assert.match(hint,/data-action="journal-show-savings"/,'A savings/flow conflict must offer explicit recovery');assert.match(hint,/épargne/i);assert.match(hint,/revenu|achat|dépens|transfert/i,'Explain why savings do not belong to the selected flow');
  await a.click('journal-show-savings');
  assert.equal(a.t.state.flow,'all');assert.equal(a.t.state.kind,kind);assert.equal(a.t.state.category,category);assert.equal(a.t.state.query,'Voyage');assert.equal(a.t.state.more,true);assert.equal(a.t.getMonth(),'2026-10');
  assert.equal(a.node('#kind-filter').value,kind);assert.equal(a.node('#category-filter').value,category);assert.equal(a.node('#search').value,'Voyage');assert.equal(a.node('[data-flow="all"]').attributes['aria-pressed'],'true');
  const rows=[...a.node('#journal-results').innerHTML.matchAll(/data-id="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(rows,expected);
  assert.doesNotMatch(a.node('#journal-companion').innerHTML,/data-action="journal-show-savings"/);assert.equal(JSON.stringify(d),before);assert.equal(a.E.balance(d),balance);
  if(expected.length){const summary=a.node('#journal-summary').innerHTML;assert.match(summary,/30,00/);assert.match(summary,/5,00/);assert.match(summary,/mis de côté/);assert.match(summary,/retirés/);assert.doesNotMatch(summary,/<dd>[^<]*30,00/,'Savings must stay outside spending totals');}
 }
});

test('ordinary empty results and savings in All do not offer conflict recovery',()=>{
 const a=app();a.node('#kind-filter').value='all';a.node('#category-filter').value='telephone';a.node('#search').value='introuvable';a.t.journalFlow('expense');assert.doesNotMatch(a.node('#journal-companion').innerHTML,/journal-show-savings/);
 a.node('#kind-filter').value='savings';a.node('#category-filter').value='epargne';a.t.journalFlow('all');assert.doesNotMatch(a.node('#journal-companion').innerHTML,/journal-show-savings/);
});
