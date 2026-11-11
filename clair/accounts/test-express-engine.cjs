const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=process.env.CLAIR_ENGINE_SCRIPT?fs.readFileSync(process.env.CLAIR_ENGINE_SCRIPT,'utf8'):[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)][0][1];
const box={window:{},Intl,Date};vm.createContext(box);vm.runInContext(script,box);const E=box.window.ClairEngine;
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const metadata=()=>({source:'express',createdAt:'2026-11-04T23:30:00.000Z',originalCurrency:'EUR',accountId:'current-budget',idempotencyKey:'request-1'});
function budget(){const d=E.empty();Object.assign(d,{initialized:true,setupDone:true,openingCents:10000,openingBalanceDate:'2026-11-01',expressSchema:1});d.preferences.express={defaultAccountId:'current-budget'};d.transactions=[{id:'request-1',type:'expense',amountCents:300,name:'Dépense Express',categoryId:'non-classee',date:'2026-11-05',express:metadata()}];return d;}

test('Express metadata and budget confirmation survive normalized JSON backups',()=>{
 const d=E.normalize(budget()),roundTrip=E.normalize(copy(d));
 assert.deepEqual(copy(roundTrip.transactions[0].express),metadata());assert.equal(roundTrip.expressSchema,1);
 assert.deepEqual(copy(roundTrip.preferences.express),{defaultAccountId:'current-budget'});assert.equal(E.balance(roundTrip,'2026-11-05'),9700);
 const legacy=E.empty(),clean=E.normalize(legacy);assert.equal(Object.hasOwn(clean,'expressSchema'),false);assert.equal(Object.hasOwn(clean.preferences,'express'),false);
});
test('incomplete or duplicate Express provenance is rejected before import can strip it',()=>{
 for(const field of ['source','createdAt','originalCurrency','accountId','idempotencyKey']){const d=budget();delete d.transactions[0].express[field];assert.throws(()=>E.normalize(d),/Express|express/);}
 for(const [field,value] of [['source','bank'],['createdAt','2026-02-30T12:00:00.000Z'],['createdAt','2026-11-05'],['createdAt','bad'],['originalCurrency','ZZZ'],['accountId','other-account'],['idempotencyKey','__proto__']]){const d=budget();d.transactions[0].express[field]=value;assert.throws(()=>E.normalize(d),/Express|express/);}
 const duplicate=budget();duplicate.transactions.push({...duplicate.transactions[0],id:'other-id',express:metadata()});assert.throws(()=>E.normalize(duplicate),/Express|express/);
 const badPrefs=budget();badPrefs.preferences.express.defaultAccountId='other-account';assert.throws(()=>E.normalize(badPrefs),/Express|express/);
 const future=budget();future.expressSchema=2;assert.throws(()=>E.normalize(future),/Express|express/);
 const missingSchema=budget();delete missingSchema.expressSchema;assert.throws(()=>E.normalize(missingSchema),/Express|express/);
});
test('dateAt uses the transaction instant and Europe Paris across midnight and DST',()=>{
 assert.equal(E.dateAt?.('2026-11-04T23:30:00.000Z'),'2026-11-05');
 assert.equal(E.dateAt('2026-03-28T23:30:00.000Z'),'2026-03-29');assert.equal(E.dateAt('2026-07-01T22:30:00.000Z'),'2026-07-02');
 assert.throws(()=>E.dateAt('not-a-date'),/date|Date|instant/);assert.throws(()=>E.dateAt('2026-02-30T12:00:00.000Z'),/date|Date|instant/);
});
test('GBP supports native amounts and same currency exchange with verified cross rates',()=>{
 const d=budget();d.currency='GBP';d.transactions[0].express.originalCurrency='GBP';const clean=E.normalize(d);
 assert.equal(clean.currency,'GBP');assert.equal(E.cents('0,50','GBP'),50);assert.equal(E.inputAmount(300,'GBP'),'3,00');assert.match(E.formatMoney(300,'GBP'),/3[,.]00/);
 assert.equal(E.exchangeRate('GBP','GBP'),1);assert.equal(E.exchangeAmount(300,'GBP','GBP'),300);assert.equal(E.convertCurrency(clean,'GBP','2026-11-05').transactions[0].amountCents,300);
 for(const code of ['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']){assert.ok(E.exchangeRate(clean.currency,code)>0);assert.ok(E.exchangeAmount(100000,clean.currency,code)>0);const out=E.convertCurrency(clean,code,'2026-11-05');assert.equal(out.currency,code);assert.deepEqual(copy(out.transactions[0].express),copy(clean.transactions[0].express));}
});
test('MAD supports native amounts and same currency exchange with verified cross rates',()=>{
 const d=budget();d.currency='MAD';d.transactions[0].express.originalCurrency='MAD';d.transactions[0].amountCents=325;const clean=E.normalize(copy(d));assert.equal(clean.version,3);assert.equal(clean.expressSchema,1);assert.equal(clean.transactions[0].express.originalCurrency,'MAD');assert.equal(E.balance(clean,'2026-11-05'),9675);assert.equal(E.normPrefs({dailyGoal:{currency:'MAD',amountCents:2550}}).dailyGoal.amountCents,2550);
 assert.equal(clean.currency,'MAD');assert.equal(E.cents('0,50','MAD'),50);assert.equal(E.inputAmount(300,'MAD'),'3,00');assert.match(E.formatMoney(300,'MAD'),/3[,.]00/);
 assert.equal(E.exchangeRate('MAD','MAD'),1);assert.equal(E.exchangeAmount(300,'MAD','MAD'),300);assert.equal(E.convertCurrency(clean,'MAD','2026-11-05').transactions[0].amountCents,325);
 for(const code of ['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']){assert.ok(E.exchangeRate(clean.currency,code)>0);assert.ok(E.exchangeAmount(100000,clean.currency,code)>0);const out=E.convertCurrency(clean,code,'2026-11-05');assert.equal(out.currency,code);assert.deepEqual(copy(out.transactions[0].express),copy(clean.transactions[0].express));}
});
test('CAD supports native amounts and same currency exchange with verified cross rates',()=>{
 const d=budget();d.currency='CAD';d.transactions[0].express.originalCurrency='CAD';d.transactions[0].amountCents=325;const clean=E.normalize(copy(d));assert.equal(clean.version,3);assert.equal(clean.expressSchema,1);assert.equal(clean.transactions[0].express.originalCurrency,'CAD');assert.equal(E.balance(clean,'2026-11-05'),9675);assert.equal(E.normPrefs({dailyGoal:{currency:'CAD',amountCents:2550}}).dailyGoal.amountCents,2550);
 assert.equal(clean.currency,'CAD');assert.equal(E.cents('0,50','CAD'),50);assert.equal(E.inputAmount(300,'CAD'),'3,00');assert.match(E.formatMoney(300,'CAD'),/3[,.]00/);
 assert.equal(E.exchangeRate('CAD','CAD'),1);assert.equal(E.exchangeAmount(300,'CAD','CAD'),300);assert.equal(E.convertCurrency(clean,'CAD','2026-11-05').transactions[0].amountCents,325);
 for(const code of ['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']){assert.ok(E.exchangeRate(clean.currency,code)>0);assert.ok(E.exchangeAmount(100000,clean.currency,code)>0);const out=E.convertCurrency(clean,code,'2026-11-05');assert.equal(out.currency,code);assert.deepEqual(copy(out.transactions[0].express),copy(clean.transactions[0].express));}
});
test('CHF supports native amounts and same currency exchange with verified cross rates',()=>{
 const d=budget();d.currency='CHF';d.transactions[0].express.originalCurrency='CHF';d.transactions[0].amountCents=325;const clean=E.normalize(copy(d));assert.equal(clean.version,3);assert.equal(clean.expressSchema,1);assert.equal(clean.transactions[0].express.originalCurrency,'CHF');assert.equal(E.balance(clean,'2026-11-05'),9675);assert.equal(E.normPrefs({dailyGoal:{currency:'CHF',amountCents:2550}}).dailyGoal.amountCents,2550);
 assert.equal(clean.currency,'CHF');assert.equal(E.cents('0,50','CHF'),50);assert.equal(E.inputAmount(300,'CHF'),'3,00');assert.match(E.formatMoney(300,'CHF'),/3[,.]00/);
 assert.equal(E.exchangeRate('CHF','CHF'),1);assert.equal(E.exchangeAmount(300,'CHF','CHF'),300);assert.equal(E.convertCurrency(clean,'CHF','2026-11-05').transactions[0].amountCents,325);
 for(const code of ['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']){assert.ok(E.exchangeRate(clean.currency,code)>0);assert.ok(E.exchangeAmount(100000,clean.currency,code)>0);const out=E.convertCurrency(clean,code,'2026-11-05');assert.equal(out.currency,code);assert.deepEqual(copy(out.transactions[0].express),copy(clean.transactions[0].express));}
});
test('verified conversions retain the original Express provenance and account preference',()=>{
 const d=budget(),before=JSON.stringify(d),out=E.convertCurrency(d,'USD','2026-11-05');
 assert.deepEqual(copy(out.transactions[0].express),metadata());assert.equal(out.transactions[0].amountCents,334);assert.equal(out.preferences.express.defaultAccountId,'current-budget');assert.equal(out.expressSchema,1);assert.equal(JSON.stringify(d),before);
});
