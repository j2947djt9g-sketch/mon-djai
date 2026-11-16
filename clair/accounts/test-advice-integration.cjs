const assert=require('node:assert/strict'),{test}=require('node:test'),app=require('./budget-test-harness.cjs');
test('ordinary monthly envelope saves record dated evidence; recurring and reset retain their meaning',async()=>{
 const a=app(),before=JSON.stringify(a.t.getData().transactions);
 await a.submit({formId:'budget-form',categoryId:'alimentation',scope:'month',amount:'140'});
 assert.equal(a.t.getData().budgetOverrides['2026-10'].alimentation,140);
 assert.equal(a.t.getData().advice?.goals['2026-10'].alimentation.amountCents,14000);
 assert.equal(a.t.getData().advice.goals['2026-10'].alimentation.setOn,a.E.today());
 await a.submit({formId:'budget-form',categoryId:'alimentation',scope:'recurring',amount:'150'});
 assert.equal(a.t.getData().budgets.alimentation,150);
 assert.equal(a.t.getData().advice.goals['2026-10'].alimentation.amountCents,14000);
 await a.submit({formId:'budget-form',categoryId:'alimentation',scope:'reset',amount:'140'});
 assert.equal(a.t.getData().budgetOverrides['2026-10'].alimentation,undefined);
 assert.equal(a.t.getData().advice.goals['2026-10'].alimentation,undefined);
 assert.equal(JSON.stringify(a.t.getData().transactions),before);
});
test('optional declared location remains outside preferences and cannot change the ledger or currency',async()=>{
 const a=app(),before=JSON.stringify(a.t.getData().transactions),currency=a.t.getData().currency;
 await a.submit({formId:'profile-form',profileName:'Test',adviceCountry:'MA',adviceCity:'Rabat'});
 assert.equal(a.t.getData().advice.location.country,'MA');assert.equal(a.t.getData().advice.location.city,'Rabat');
 assert.equal(a.t.getData().preferences.adviceCountry,undefined);assert.equal(a.t.getData().currency,currency);assert.equal(JSON.stringify(a.t.getData().transactions),before);
});
test('legacy backup import preserves the upgraded marker while replacing only after explicit confirmation',async()=>{
 const a=app();a.t.commit(d=>a.sandbox.ClairAdviceCommands.setLocation(d,{country:'FR',city:'Test'}));
 const legacy=a.E.empty(),before=JSON.stringify(a.t.getData());
 await a.t.importFile({size:100,text:async()=>JSON.stringify(legacy)});assert.equal(JSON.stringify(a.t.getData()),before);
 assert.equal(a.t.getModal().kind,'confirm');await a.click('confirm');
 assert.equal(a.t.getData().adviceSchema,1);assert.equal(a.t.getData().advice.location.country,'');
});
test('explicit reset keeps the marker and its backup; no automatic reset from normal advice',async()=>{
 const a=app();a.t.commit(d=>a.sandbox.ClairAdviceCommands.setLocation(d,{country:'FR',city:'Test'}));await a.click('reset');
 const form=a.node('#reset-form');form.id='reset-form';form.fields={confirmation:'EFFACER'};form.closest=()=>true;
 await a.events.submit({target:form,preventDefault(){}});
 assert.equal(a.t.getData().adviceSchema,1);assert.equal(a.t.getData().transactions.length,0);
 assert([...a.storage.values()].some(raw=>raw.includes('"city":"Test"')));
});
