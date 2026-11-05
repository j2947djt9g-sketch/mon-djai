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
test('GBP supports native amounts and same currency exchange without an invented rate',()=>{
 const d=budget();d.currency='GBP';d.transactions[0].express.originalCurrency='GBP';const clean=E.normalize(d);
 assert.equal(clean.currency,'GBP');assert.equal(E.cents('0,50','GBP'),50);assert.equal(E.inputAmount(300,'GBP'),'3,00');assert.match(E.formatMoney(300,'GBP'),/3[,.]00/);
 assert.equal(E.exchangeRate('GBP','GBP'),1);assert.equal(E.exchangeAmount(300,'GBP','GBP'),300);assert.equal(E.convertCurrency(clean,'GBP','2026-11-05').transactions[0].amountCents,300);
 for(const code of ['EUR','USD','XOF','XAF']){assert.throws(()=>E.exchangeAmount(300,'GBP',code),/taux.*vérifié/i);assert.throws(()=>E.exchangeAmount(300,code,'GBP'),/taux.*vérifié/i);assert.throws(()=>E.exchangeRate('GBP',code),/taux.*vérifié/i);assert.throws(()=>E.convertCurrency(clean,code,'2026-11-05'),/taux.*vérifié/i);}
});
test('verified conversions retain the original Express provenance and account preference',()=>{
 const d=budget(),before=JSON.stringify(d),out=E.convertCurrency(d,'USD','2026-11-05');
 assert.deepEqual(copy(out.transactions[0].express),metadata());assert.equal(out.transactions[0].amountCents,336);assert.equal(out.preferences.express.defaultAccountId,'current-budget');assert.equal(out.expressSchema,1);assert.equal(JSON.stringify(d),before);
});
