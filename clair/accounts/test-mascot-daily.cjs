const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function context(){
 let clock=Date.parse('2026-10-15T12:00:00Z'),failStorage=false;const storage=new Map(),nodes=new Map(),events={},timers=[];
 class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',dataset:{},style:{},open:false,hidden:false,showModal(){this.open=true},close(){this.open=false},addEventListener(){},scrollIntoView(){},focus(){}});return nodes.get(selector)};
 const sandbox={Intl,Date:TestDate,TextEncoder,URL,URLSearchParams,Blob,structuredClone,crypto,console,AbortController,
 setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},setInterval(){},
 location:{protocol:'file:',href:'file:///clair/index.html'},navigator:{onLine:true},matchMedia:()=>({matches:false,addEventListener(){}}),
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('Quota exceeded');storage.set(k,v)},removeItem:k=>storage.delete(k)},
 document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn}},
 FormData:class{constructor(form){this.values=form.values}get(key){return this.values[key]??null}}};
 sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.CLAIR_ACCOUNT_CONFIG=null;
 vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);
 const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
 vm.runInContext(scripts[3].slice(0,boot)+`window.test={home,journal,journalResults,balanceCompanion,render,openTx,feedback:()=>journalFeedback,setData(d){data=d;snapshot=JSON.stringify(d);localStorage.setItem(KEY,snapshot)},getData:()=>data,setPage:p=>{page=p},setMonth:m=>{month=m}};})();`,sandbox);
 return {E:sandbox.ClairEngine,t:sandbox.test,node,events,timers,advance:ms=>clock+=ms,failStorage:()=>{failStorage=true}};
}
const prepared=c=>{const d=c.E.empty();d.initialized=d.setupDone=true;d.openingBalanceDate='2026-10-15';d.openingCents=50000;return d};
const rent={id:'rent',name:'Loyer',categoryId:'logement',kind:'monthly',amountCents:60000,amounts:[],start:'2026-10-16',end:null,pauses:[],day:20,month:1,reminderEnabled:true};
async function main(){
 const a=context(),d=prepared(a);d.rules.push(rent);
 for(const [opening,state,pose]of [[50000,'shortfall',1],[60000,'committed',2],[100000,'covered',3],[0,'zero',4],[-1,'negative',5]]){
  d.openingCents=opening;a.t.setData(structuredClone(d));const before=JSON.stringify(a.t.getData()),view=a.t.home();
  assert.match(view,new RegExp('data-mascot-state="'+state+'"'));assert.match(view,new RegExp('pose-'+pose+' balance-companion'));
  assert.equal(a.E.reserve(a.t.getData()).cents,60000);assert.equal(JSON.stringify(a.t.getData()),before);
 }
 d.setupDone=false;d.openingCents=-1;a.t.setData(structuredClone(d));assert.match(a.t.home(),/data-mascot-state="negative"/);d.openingCents=0;a.t.setData(structuredClone(d));assert.match(a.t.home(),/data-mascot-state="zero"/);d.setupDone=true;
 d.openingCents=100000;d.rules=[];a.t.setData(structuredClone(d));assert.match(a.t.home(),/data-mascot-state="unreserved"/);
 d.setupDone=false;a.t.setData(d);assert.match(a.t.home(),/data-mascot-state="setup"/);
 console.log('PASS: forecast deficit despite positive balance, exact coverage, margin, negative balance, no scheduled expenses and incomplete setup; render does not mutate the budget');
 const b=context();b.t.setData(prepared(b));b.t.setPage('journal');b.t.render();
 assert.match(b.node('#journal-companion').innerHTML,/Ton historique commence ici/);assert.equal(b.node('#journal-results').hidden,true);
 b.node('#search').value='anything';b.t.journalResults();assert.match(b.node('#journal-companion').innerHTML,/data-mascot-state="filtered"/);
 b.node('#search').value='';b.node('#kind-filter').value='';
 b.t.openTx(null,'expense','loisirs');
 const form={id:'tx-form',closest:()=>true,values:{date:'2026-10-15',name:'<img src=x onerror=alert(1)>',amount:'12,50',categoryId:'loisirs',note:''}};
 await b.events.submit({target:form,preventDefault(){}});
 assert.equal(b.t.getData().transactions.length,1);assert.equal(b.E.balance(b.t.getData()),48750);
 assert.match(b.node('#journal-companion').innerHTML,/data-mascot-state="saved"/);assert.match(b.node('#journal-companion').innerHTML,/pose-3/);
 assert.match(b.node('#journal-results').innerHTML,/&lt;img/);assert.doesNotMatch(b.node('#journal-results').innerHTML,/<img src=x/);
 b.node('#search').value='no matching operation';b.t.journalResults();assert.doesNotMatch(b.node('#journal-companion').innerHTML,/state="saved"/);
 b.node('#search').value='';b.node('#kind-filter').value='income';b.t.journalResults();assert.doesNotMatch(b.node('#journal-companion').innerHTML,/state="saved"/);
 b.node('#kind-filter').value='all';b.t.setMonth('2026-09');b.t.journalResults();assert.match(b.node('#journal-companion').innerHTML,/Aucune opération ce mois-ci/);
 b.t.setMonth('2026-10');b.t.journalResults();assert.match(b.node('#journal-companion').innerHTML,/state="saved"/);
 b.advance(4501);b.timers.find(x=>x.ms===4500).fn();assert.equal(b.t.feedback(),null);assert.match(b.node('#journal-companion').innerHTML,/state="entries"/);
 b.node('#search').value='keep my search';b.t.journalResults();assert.equal(b.node('#search').value,'keep my search');
 console.log('PASS: empty history, successful saved entry, escaped text, search/type/month filters and expiration preserve the journal controls');
 const c=context();c.t.setData(prepared(c));c.t.setPage('journal');c.t.render();c.t.openTx(null,'expense','loisirs');c.failStorage();
 await c.events.submit({target:{...form,values:{...form.values,name:'Courses'}},preventDefault(){}});
 assert.equal(c.t.getData().transactions.length,0);assert.equal(c.t.feedback(),null);assert.doesNotMatch(c.node('#journal-companion').innerHTML,/state="saved"/);
 const e=context();e.t.setData(prepared(e));e.t.setPage('journal');e.t.render();e.t.openTx(null,'expense','loisirs');
 await e.events.submit({target:{...form,values:{...form.values,name:'Courses'}},preventDefault(){}});
 await e.events.click({target:{closest:()=>({dataset:{action:'undo'}})}});
 assert.equal(e.t.getData().transactions.length,0);assert.match(e.node('#journal-companion').innerHTML,/state="empty"/);
 console.log('PASS: storage failure never celebrates; undo removes both the entry and its success reaction');
}
main().catch(error=>{console.error(error);process.exitCode=1});
