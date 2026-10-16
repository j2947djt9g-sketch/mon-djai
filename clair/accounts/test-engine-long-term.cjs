const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),engine=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const sandbox={window:{},Date,Intl};vm.createContext(sandbox);vm.runInContext(engine,sandbox);const E=sandbox.window.ClairEngine;
const rule=(id,kind,amountCents,day=31,month=2)=>({id,name:id,categoryId:'autre',kind,amountCents,day,month,start:'2027-01-01',end:null,pauses:[],amounts:kind==='weekly'?Array(7).fill(amountCents):[]});
let budget=E.empty();budget.initialized=budget.setupDone=true;budget.openingCents=1000000;budget.openingBalanceDate='2027-01-01';
budget.rules=[rule('daily','weekly',100),rule('monthly','monthly',2000),rule('annual','yearly',3000,29)];
for(let year=2027;year<=2036;year++){
 const date=year+'-12-31';assert(E.sync(budget,date)>0);const count=budget.transactions.length;
 for(let retry=0;retry<3;retry++)assert.equal(E.sync(budget,date),0);
 budget=E.normalize(JSON.parse(JSON.stringify(budget)));assert.equal(budget.transactions.length,count);assert.equal(E.sync(budget,date),0);
}
assert.equal(budget.transactions.filter(t=>t.ruleId==='daily').length,3653);
assert.equal(budget.transactions.filter(t=>t.ruleId==='monthly').length,120);
assert.equal(budget.transactions.filter(t=>t.ruleId==='annual').length,10);
assert.equal(budget.transactions.length,3783);assert.equal(new Set(budget.transactions.map(t=>t.autoKey)).size,3783);
assert.equal(E.balance(budget,'2036-12-31'),1000000-3653*100-120*2000-10*3000);
for(const date of ['2027-02-28','2028-02-29','2032-02-29','2036-02-29']){
 assert(budget.transactions.some(t=>t.ruleId==='monthly'&&t.date===date));assert(budget.transactions.some(t=>t.ruleId==='annual'&&t.date===date));
}
console.log('PASS: ten years of daily, monthly and yearly expenses, leap years, repeated catch-up and annual reloads preserve exact balances without duplicates');
const full=E.empty();full.initialized=full.setupDone=true;full.openingBalanceDate='2027-01-01';full.rules=[rule('daily','weekly',100)];
full.transactions=Array.from({length:50000},(_,i)=>({id:'manual-'+i,type:'expense',amountCents:1,date:'2027-01-01',autoKey:null}));
const before=JSON.stringify(full);assert.throws(()=>E.sync(full,'2027-01-01'),/50 000/);assert.equal(JSON.stringify(full),before);
console.log('PASS: operation capacity is reported before modifying the budget');
