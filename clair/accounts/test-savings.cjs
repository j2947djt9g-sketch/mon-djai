const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const nodes=new Map(),storage=new Map(),events={};
class TestDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-19T12:00:00Z']))}static now(){return Date.parse('2026-10-19T12:00:00Z')}}
const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',style:{},dataset:{},open:false,showModal(){this.open=true},close(){this.open=false},scrollIntoView(){},focus(){},addEventListener(){}});return nodes.get(s)};
const sandbox={window:null,Date:TestDate,Intl,structuredClone,crypto,URL,URLSearchParams,Blob,TextEncoder,console,AbortController,location:{protocol:'file:',href:'file:///clair/index.html'},navigator:{onLine:true},CLAIR_ACCOUNT_CONFIG:null,matchMedia:()=>({matches:false,addEventListener(){}}),setTimeout:()=>1,clearTimeout(){},setInterval(){},addEventListener(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{documentElement:{dataset:{}},body:{dataset:{}},querySelector:node,addEventListener:(type,fn)=>{events[type]=fn}},FormData:class{constructor(form){this.values=form.values}get(k){return this.values[k]??null}}};sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(scripts[0],sandbox);vm.runInContext(scripts[2],sandbox);const boot=scripts[3].indexOf('  render();if(!cloud.enabled)catchUp();');assert(boot>0);
vm.runInContext(scripts[3].slice(0,boot)+`window.test={home,budget,savingsSection,savingsDetail,savingsProjectForm,savingsMove,savingsProgress,savingsAction,savingsSubmit,openTx,getData:()=>data,setData(d){data=E.normalize(d);snapshot=JSON.stringify(data);localStorage.setItem(KEY,snapshot)},setPage:p=>page=p,getModal:()=>modal};})();`,sandbox);
const E=sandbox.ClairEngine,t=sandbox.test,plain=x=>JSON.parse(JSON.stringify(x));
const ready=()=>{const d=E.empty();d.initialized=d.setupDone=true;d.openingCents=100000;d.openingBalanceDate='2026-10-19';return d};
const project=(id='trip')=>({id,name:'Voyage en Côte d’Ivoire',kind:'voyage',icon:'plane',color:'violet',targetCents:100000,targetDate:null,archived:false});
function submit(id,values){return events.submit({target:{id,values,closest:()=>true},preventDefault(){}})}
const legacy=ready();delete legacy.savingsProjects;delete legacy.savingsSchema;legacy.savingsGoal=1000;legacy.transactions=[{id:'old-saving',type:'expense',amountCents:20000,date:'2026-10-19',name:'Mise de côté',categoryId:'epargne'}];
const migrated=E.normalize(legacy);assert.equal(migrated.savingsProjects.length,1);assert.equal(migrated.savingsProjects[0].id,'savings-legacy');assert.equal(E.savingsBalance(migrated,'savings-legacy'),20000);assert.equal(E.balance(migrated),80000);assert.equal(migrated.transactions.length,1);assert.deepEqual(plain(E.normalize(plain(migrated))),plain(migrated));
const onlyGoal=ready();delete onlyGoal.savingsProjects;onlyGoal.savingsGoal=1000;const goal=E.normalize(onlyGoal);assert.equal(E.savingsBalance(goal,'savings-legacy'),0);assert.equal(E.balance(goal),100000);
console.log('PASS legacy goal and savings migrate once without inventing money or deducting it twice');
(async()=>{
 t.setData(ready());t.savingsProjectForm();await submit('savings-project-form',{name:'Voyage en Côte d’Ivoire',kind:'voyage',icon:'plane',color:'violet',target:'1000',targetDate:'2027-08-01'});let d=t.getData(),p=d.savingsProjects[0];assert(p);assert.equal(p.icon,'plane');assert.equal(p.targetCents,100000);const pid=p.id;
 t.savingsMove(pid);await submit('savings-move-form',{projectId:pid,amount:'250',note:'Premier versement'});d=t.getData();assert.equal(E.balance(d),75000);assert.equal(E.savingsBalance(d,pid),25000);assert.equal(t.savingsProgress(d.savingsProjects[0]).percent,25);const depositId=d.transactions[0].id;
 t.savingsMove(pid,'withdraw');await submit('savings-move-form',{projectId:pid,amount:'50'});d=t.getData();assert.equal(E.balance(d),80000);assert.equal(E.savingsBalance(d,pid),20000);assert.equal(d.transactions.length,2);
 assert.match(t.budget(),/Épargne suivie/);assert(!t.budget().includes('>50,00'));assert.match(t.home(),/savings-title/);assert.match(t.home(),/Il restera/);
 const snapshot=JSON.stringify(d);t.savingsMove(pid,'withdraw');await submit('savings-move-form',{projectId:pid,amount:'201'});assert.equal(JSON.stringify(t.getData()),snapshot);assert.match(node('#form-error').textContent,/dépasse/);
 t.savingsMove(pid);await submit('savings-move-form',{projectId:pid,amount:'801'});assert.equal(JSON.stringify(t.getData()),snapshot);
 t.savingsMove(pid,'deposit',d.transactions.find(x=>x.id===depositId));await submit('savings-move-form',{amount:'49'});assert.equal(JSON.stringify(t.getData()),snapshot);assert.match(node('#form-error').textContent,/retirerait plus/);
 console.log('PASS create plane project, deposit and withdrawal update only available and project funds; invalid withdrawals, edits and deposits preserve the budget');
 d=plain(t.getData());d.savingsProjects.push(project('school'));t.setData(d);assert.equal(E.savingsBalance(t.getData(),'school'),0);assert.equal(E.savingsBalance(t.getData(),pid),20000);
 t.savingsProjectForm(t.getData().savingsProjects[0]);await submit('savings-project-form',{name:'<img src=x onerror=alert(1)>',kind:'voyage',icon:'plane',color:'blue',target:'1000',targetDate:''});p=t.getData().savingsProjects[0];assert.equal(E.savingsBalance(t.getData(),pid),20000);assert.equal(p.id,pid);assert.match(t.savingsSection(),/&lt;img/);t.savingsDetail(pid);assert(!node('#dialog').innerHTML.includes('<img src=x'));assert.match(node('#dialog').innerHTML,/&lt;img/);
 const roundtrip=E.normalize(plain(t.getData()));assert.deepEqual(plain(roundtrip),plain(t.getData()));assert.equal(roundtrip.savingsProjects[0].color,'blue');assert.equal(roundtrip.transactions[1].savingsProjectId,pid);
 console.log('PASS isolated projects, renamed goals, escaped custom names and exact export/import round trip');
 d=ready();d.savingsProjects=[project()];d.transactions=[{id:'almost',type:'expense',amountCents:99999,date:'2026-10-19',categoryId:'epargne',savingsProjectId:'trip'}];t.setData(d);assert.equal(t.savingsProgress(t.getData().savingsProjects[0]).percent,99.9);assert.equal(t.savingsProgress(t.getData().savingsProjects[0]).done,false);
 d.transactions[0].amountCents=100000;t.setData(d);assert.equal(t.savingsProgress(t.getData().savingsProjects[0]).done,true);assert.match(t.savingsSection(),/Objectif atteint/);
 d.transactions[0].date='2026-10-20';t.setData(d);assert.equal(E.savingsBalance(t.getData(),'trip'),0);assert.throws(()=>t.savingsMove('trip','withdraw'),/pas encore/);
 const invalid=plain(t.getData());invalid.transactions.push({id:'early-withdraw',type:'income',amountCents:100,date:'2026-10-19',categoryId:'epargne',savingsProjectId:'trip'});assert.throws(()=>E.normalize(invalid),/retirerait plus/);
 console.log('PASS progress never reaches 100% early; future savings cannot be withdrawn today');
 for(const bad of [{...project(),targetCents:-1},{...project(),targetDate:'2026-02-30'},{...project(),name:''}]){const value=ready();value.savingsProjects=[bad];assert.throws(()=>E.normalize(value),/invalide/);}
 const future=ready();future.savingsSchema=2;assert.throws(()=>E.normalize(future),/plus récente/);
 const duplicate=ready();duplicate.savingsProjects=[project(),project()];assert.throws(()=>E.normalize(duplicate),/invalide/);
 console.log('PASS invalid imports, duplicate IDs and future incompatible formats fail without silently losing savings');
 let years=ready();years.openingCents=1000000;years.savingsProjects=[project()];
 for(let year=2027;year<=2036;year++)for(let month=1;month<=12;month++){
  const date=year+'-'+String(month).padStart(2,'0')+'-01';years.transactions.push({id:'in-'+date,type:'expense',amountCents:500,date,categoryId:'epargne',savingsProjectId:'trip'},{id:'out-'+date,type:'income',amountCents:100,date,categoryId:'epargne',savingsProjectId:'trip'});
  years=E.normalize(plain(years));assert.equal(E.balance(years,date)+E.savingsBalance(years,'trip',date),1000000);
 }
 assert.equal(E.savingsBalance(years,'trip','2036-12-31'),48000);assert.equal(years.transactions.length,240);
 console.log('PASS ten years of project deposits, withdrawals and round trips conserve every cent without duplication');
})().catch(e=>{console.error(e);process.exitCode=1});
