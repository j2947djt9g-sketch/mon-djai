const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const box={window:{},Intl,Date};vm.createContext(box);vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],box);const E=box.window.ClairEngine;
const rule=(id,day,amountCents=1000)=>({id,name:id,categoryId:'abonnements',kind:'monthly',start:'2026-10-01',end:null,day,month:1,amountCents,amounts:[],pauses:[],reminderEnabled:true});
function budget(){const d=E.empty();d.initialized=d.setupDone=true;d.openingBalanceDate='2026-10-01';d.openingCents=10000;d.rules=[rule('phone',23),rule('transport',27,2200)];return d;}
const d=budget();E.sync(d,'2026-10-21');assert.equal(E.balance(d,'2026-10-21'),10000);assert.equal(E.upcoming(d,'2026-10-21')[0].days,2);
E.sync(d,'2026-10-23');assert.equal(E.balance(d,'2026-10-23'),9000);
assert.deepEqual(Array.from(E.upcoming(d,'2026-10-23'),c=>c.autoKey),['transport:2026-10-27','phone:2026-11-23']);
for(let i=0;i<10;i++)assert.equal(E.sync(d,'2026-10-23'),0);
assert.equal(E.balance(d,'2026-10-23'),9000);assert.equal(d.transactions.length,1);assert.equal(d.transactions[0].paymentConfirmed,false);
assert(!E.upcoming(d,'2026-10-24').some(c=>c.dueDate<='2026-10-24'));
E.sync(d,'2026-12-01');assert.equal(E.balance(d,'2026-12-01'),3600);assert.equal(d.transactions.length,4);assert.equal(E.sync(d,'2026-12-01'),0);assert.equal(E.upcoming(d,'2026-12-01')[0].dueDate,'2026-12-23');
const feb=budget();feb.rules=[{...rule('month-end',31),start:'2027-01-01'}];feb.openingBalanceDate='2027-01-01';E.sync(feb,'2027-02-28');assert.equal(E.balance(feb,'2027-02-28'),8000);assert.equal(E.upcoming(feb,'2027-02-28')[0].dueDate,'2027-03-31');
const annual=budget();annual.rules=[{...rule('annual',23),kind:'yearly',month:10}];E.sync(annual,'2026-10-23');assert.equal(E.upcoming(annual,'2026-10-23')[0].dueDate,'2027-10-23');
const early=budget();early.transactions.push({id:'paid',autoKey:'phone:2026-10-23',ruleId:'phone',name:'phone',type:'expense',categoryId:'abonnements',date:'2026-10-21',amountCents:1000,earlyPaid:true,paymentConfirmed:true});E.sync(early,'2026-10-23');assert.equal(E.balance(early,'2026-10-23'),9000);assert.equal(early.transactions.length,1);assert.equal(E.upcoming(early,'2026-10-21').find(c=>c.ruleId==='phone').dueDate,'2026-11-23');
const paused=budget();paused.rules[0].pauses=[{start:'2026-10-20',end:'2026-11-30'}];assert.equal(E.upcoming(paused,'2026-10-21').find(c=>c.ruleId==='phone').dueDate,'2026-12-23');paused.rules[0].end='2026-11-30';assert(!E.upcoming(paused,'2026-10-21').some(c=>c.ruleId==='phone'));
const skipped=budget();skipped.skipped=['phone:2026-10-23'];assert.equal(E.upcoming(skipped,'2026-10-21').find(c=>c.ruleId==='phone').dueDate,'2026-11-23');
console.log('PASS J-2, debit once, automatic removal, chronological rollover, catch-up, short months, yearly subscriptions, early payments and pauses');
