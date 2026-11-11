const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=process.env.CLAIR_ENGINE_SCRIPT?fs.readFileSync(process.env.CLAIR_ENGINE_SCRIPT,'utf8'):[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)][0][1],box={window:{},Intl,Date};
vm.createContext(box);vm.runInContext(script,box);const E=box.window.ClairEngine,path=__dirname+'/express-core.js';if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),box);const C=box.window.ClairExpressCore||{};
const copy=x=>JSON.parse(JSON.stringify(x));
function budget(confirmed=true,currency='EUR'){const d=E.empty();Object.assign(d,{initialized:true,setupDone:true,currency,openingCents:100000,openingBalanceDate:'2026-11-01'});if(confirmed){d.expressSchema=1;d.preferences.express={defaultAccountId:'current-budget'};}return d;}
const input=(extra={})=>({id:'express-1',rawAmount:'3',createdAt:'2026-11-04T23:30:00.000Z',categoryId:'non-classee',...extra});
test('default account consent belongs only to the supplied budget payload',()=>{
 const a=budget(false),b=budget(false);assert.equal(C.hasDefaultAccount?.(a),false);C.confirmDefaultAccount(a);assert.equal(C.hasDefaultAccount(a),true);assert.equal(C.hasDefaultAccount(b),false);assert.equal(a.expressSchema,1);assert.deepEqual(copy(a.preferences.express),{defaultAccountId:'current-budget'});assert.equal(a.transactions.length,0);
});
test('amount only Express input prepares a dated expense without mutating the budget',()=>{
 const d=budget(),before=JSON.stringify(d),tx=C.prepareExpense?.(E,d,input());assert.equal(tx?.amountCents,300);assert.equal(tx.name,'Dépense Express');assert.equal(tx.date,'2026-11-05');assert.equal(tx.type,'expense');assert.equal(tx.categoryId,'non-classee');assert.deepEqual(copy(tx.express),{source:'express',createdAt:'2026-11-04T23:30:00.000Z',originalCurrency:'EUR',accountId:'current-budget',idempotencyKey:'express-1'});assert.equal(JSON.stringify(d),before);
 for(const [rawAmount,want] of [['0,50',50],['25',2500]])assert.equal(C.prepareExpense(E,d,input({rawAmount})).amountCents,want);
 for(const currency of ['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']){const tx=C.prepareExpense(E,budget(true,currency),input());assert.equal(tx.amountCents,300);assert.equal(tx.express.originalCurrency,currency);}
});
test('Express rejects unconfirmed, unconfigured, nonpositive or unsafe input without writes',()=>{
 const d=budget(),before=JSON.stringify(d);assert.throws(()=>C.prepareExpense(E,budget(false),input()),/confirm|budget/i);const empty=E.empty();assert.throws(()=>C.prepareExpense(E,empty,input()),/configur|budget/i);
 for(const rawAmount of ['','0','-1','0,001','1e3','Infinity','1000000000'])assert.throws(()=>C.prepareExpense(E,d,input({rawAmount})));
 for(const categoryId of ['epargne','income','__proto__','bad category'])assert.throws(()=>C.prepareExpense(E,d,input({categoryId})),/catégorie/i);
 for(const id of ['','__proto__','bad id'])assert.throws(()=>C.prepareExpense(E,d,input({id})),/identifiant/i);
 for(const createdAt of ['bad','2026-02-30T12:00:00.000Z','2026-11-05'])assert.throws(()=>C.prepareExpense(E,d,input({createdAt})),/date|instant/i);
 assert.throws(()=>C.prepareExpense(E,budget(true,'XOF'),input({rawAmount:'0,50'})),/entier/);assert.equal(JSON.stringify(d),before);
});
test('repeating an Express request never debits twice while collisions are rejected',()=>{
 const d=budget(),first=C.addExpense?.(E,d,input());assert.equal(first?.created,true);assert.equal(d.transactions.length,1);assert.equal(E.balance(d,'2026-11-05'),99700);const second=C.addExpense(E,d,input());assert.equal(second.created,false);assert.equal(second.transaction.id,'express-1');assert.equal(d.transactions.length,1);
 for(const extra of [{rawAmount:'25'},{categoryId:'alimentation'},{createdAt:'2026-11-04T23:31:00.000Z'}])assert.throws(()=>C.addExpense(E,d,input(extra)),/collision|différent|utilisé/i);
 const imported=budget();imported.transactions=[{...first.transaction,id:'imported-id'}];assert.throws(()=>C.addExpense(E,imported,input()),/collision|différent|utilisé/i);assert.equal(imported.transactions.length,1);
});
