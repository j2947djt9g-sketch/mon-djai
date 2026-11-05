const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=__dirname+'/express-insights.js',ctx={window:{}};
vm.createContext(ctx);
if(fs.existsSync(path))vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
const I=ctx.window.ClairExpressInsights;
assert.ok(I,'Express history helpers must be available');
const clean=value=>JSON.parse(JSON.stringify(value));
const asOf='2026-11-05',valid=['alimentation','transport','loisirs','autre','non-classee'];
const tx=(id,amountCents,categoryId='alimentation',date='2026-11-04',extra={})=>({id,type:'expense',amountCents,categoryId,date,name:'Dépense '+id,note:'',autoKey:null,ruleId:null,fixedExpenseId:null,savingsProjectId:null,...extra});
const budget=(transactions=[],currency='EUR',extra={})=>({version:3,currency,transactions,customCategories:[],...extra});
const options={asOf};
const fallback={categoryId:'non-classee',confidence:'none',sampleCount:0};

// A repeated amount can suggest a known category; one sample cannot.
assert.deepEqual(clean(I.suggestCategory(budget([tx('a',300)]),300,valid,options)),{...fallback,sampleCount:1});
const repeated=budget([tx('a',300),tx('b',300),tx('other',800,'transport')]);
assert.deepEqual(clean(I.suggestCategory(repeated,300,valid,options)),{categoryId:'alimentation',confidence:'history',sampleCount:2});
assert.deepEqual(clean(I.suggestCategory(repeated,301,valid,options)),fallback);

// Unknown/deleted categories remain in the denominator and ties stay uncertain.
assert.equal(I.suggestCategory(budget([tx('a',300),tx('b',300),tx('c',300,'removed'),tx('d',300,'removed')]),300,valid,options).categoryId,'non-classee');
assert.equal(I.suggestCategory(budget([tx('a',300),tx('b',300),tx('c',300,'transport')]),300,valid,options).categoryId,'non-classee');
assert.equal(I.suggestCategory(budget([tx('a',300),tx('b',300),tx('c',300),tx('d',300,'removed')]),300,valid,options).categoryId,'alimentation');
assert.equal(I.suggestCategory(budget([tx('a',300,'removed'),tx('b',300,'removed')]),300,valid,options).categoryId,'non-classee');
assert.equal(I.suggestCategory(repeated,300,['transport'],options).categoryId,'non-classee');
assert.equal(I.suggestCategory(repeated,300,valid,{asOf,minSamples:3}).categoryId,'non-classee');
assert.equal(I.suggestCategory(budget([tx('a',300),tx('b',300),tx('c',300),tx('d',300,'transport')]),300,valid,{asOf,minShare:.8}).categoryId,'non-classee');

// Savings, automatic charges, future records, income and malformed values never teach shortcuts.
const excluded=[
 tx('income',300,'alimentation','2026-11-04',{type:'income'}),
 tx('income-category',300,'income'),tx('saved',300,'epargne'),tx('project',300,'alimentation','2026-11-04',{savingsProjectId:'trip'}),
 tx('auto',300,'alimentation','2026-11-04',{autoKey:'rule:2026-11-04'}),
 tx('rule',300,'alimentation','2026-11-04',{ruleId:'rule'}),
 tx('fixed',300,'alimentation','2026-11-04',{fixedExpenseId:'phone'}),
 tx('future',300,'alimentation','2026-11-06'),tx('too-old',300,'alimentation','2026-08-07'),
 tx('bad-date',300,'alimentation','2026-02-30'),tx('bad-type',300,'alimentation','2026-11-04',{type:'transfer'}),
 tx('negative',-300),tx('zero',0),tx('fraction',300.5),tx('huge',Number.MAX_SAFE_INTEGER+1),
 tx('wrong-currency',300,'alimentation','2026-11-04',{currency:'USD'})
];
const filtered=budget([...excluded,tx('manual1',300),tx('manual2',300)]);
assert.deepEqual(clean(I.suggestCategory(filtered,300,valid,options)),{categoryId:'alimentation',confidence:'history',sampleCount:2});
assert.deepEqual(clean(I.frequentAmounts(budget(excluded),options)),[]);
assert.deepEqual(clean(I.similarExpenses(budget(excluded),{asOf,amountCents:300})),[]);
assert.equal(I.smallExpenseSummary(budget(excluded),{asOf,thresholdCents:500}).expenseCount,0);

// The lookback includes its first day, and no helper consults an implicit clock.
const edges=budget([tx('inside',300,'transport','2026-08-08'),tx('outside',300,'transport','2026-08-07'),tx('today',300,'transport',asOf)]);
assert.equal(I.suggestCategory(edges,300,valid,options).sampleCount,2);
assert.deepEqual(clean(I.suggestCategory(repeated,300,valid,{})),fallback);
assert.deepEqual(clean(I.frequentAmounts(repeated,{})),[]);
assert.deepEqual(clean(I.similarExpenses(repeated,{amountCents:300})),[]);
for(const invalidDate of ['2026-02-30','yesterday','2026-11-05T00:00:00Z'])assert.equal(I.suggestCategory(repeated,300,valid,{asOf:invalidDate}).confidence,'none');

// Frequent amounts are ranked by count, latest occurrence and numeric amount; singletons stay out.
const ranking=budget([
 tx('a1',300,'transport','2026-11-01'),tx('a2',300,'transport','2026-11-03'),
 tx('b1',500,'loisirs','2026-11-02'),tx('b2',500,'loisirs','2026-11-04'),
 tx('c1',2500,'autre','2026-11-01'),tx('c2',2500,'autre','2026-11-02'),tx('c3',2500,'autre','2026-11-02'),
 tx('d1',200,'transport','2026-11-02'),tx('d2',200,'transport','2026-11-04'),tx('once',50)
]);
assert.deepEqual(clean(I.frequentAmounts(ranking,options)),[
 {amountCents:2500,count:3,lastDate:'2026-11-02',categoryId:'autre'},
 {amountCents:200,count:2,lastDate:'2026-11-04',categoryId:'transport'},
 {amountCents:500,count:2,lastDate:'2026-11-04',categoryId:'loisirs'},
 {amountCents:300,count:2,lastDate:'2026-11-03',categoryId:'transport'}
]);
assert.equal(I.frequentAmounts(ranking,{asOf,limit:2}).length,2);
assert.equal(I.frequentAmounts(ranking,{asOf,minCount:3})[0].amountCents,2500);
assert.deepEqual(clean(I.frequentAmounts(budget([tx('old1',300,'removed'),tx('old2',300,'removed')]),options)),[{amountCents:300,count:2,lastDate:'2026-11-04',categoryId:'non-classee'}]);

// Similar entries are read-only amount matches, with an optional category filter and a stable order.
const similars=budget([tx('b',300,'transport','2026-11-04'),tx('old',300,'transport','2026-11-03'),tx('a',300,'loisirs','2026-11-04'),tx('different',301)]);
assert.deepEqual(clean(I.similarExpenses(similars,{asOf,amountCents:300})).map(t=>t.id),['a','b','old']);
assert.deepEqual(clean(I.similarExpenses(similars,{asOf,amountCents:300,categoryId:'transport',limit:1})),[{id:'b',amountCents:300,categoryId:'transport',date:'2026-11-04',name:'Dépense b'}]);
const copies=I.similarExpenses(similars,{asOf,amountCents:300});copies[0].name='changed';
assert.equal(similars.transactions.find(t=>t.id==='a').name,'Dépense a');
assert.deepEqual(clean(I.similarExpenses(budget([...similars.transactions].reverse()),{asOf,amountCents:300})).map(t=>t.id),['a','b','old']);

// Descriptors cannot return references to malformed historical fields.
const malformed=budget([tx({nested:'id'},300,{nested:'category'},'2026-11-04',{name:{nested:'name'}})]);
const malformedCopy=I.similarExpenses(malformed,{asOf,amountCents:300})[0];
assert.equal(malformedCopy.id,'');
assert.equal(malformedCopy.categoryId,'non-classee');
assert.equal(malformedCopy.name,'');

// Small-spend totals keep an explicit threshold and hand-checked per-category amounts.
const small=budget([tx('food1',50),tx('food2',300),tx('ride',2500,'transport'),tx('large',2501,'loisirs'),tx('old',50,'loisirs','2026-10-06'),tx('deleted',100,'removed'),tx('custom',200,'coffee')], 'EUR',{customCategories:[{id:'coffee',label:'Café'}]});
assert.deepEqual(clean(I.smallExpenseSummary(small,{asOf,thresholdCents:2500})),{
 currency:'EUR',fromDate:'2026-10-07',toDate:asOf,thresholdCents:2500,count:5,totalCents:3150,expenseCount:6,expenseTotalCents:5651,
 byCategory:[{categoryId:'transport',count:1,totalCents:2500},{categoryId:'alimentation',count:2,totalCents:350},{categoryId:'coffee',count:1,totalCents:200},{categoryId:'non-classee',count:1,totalCents:100}]
});
assert.equal(I.smallExpenseSummary(small,{asOf,thresholdCents:300}).totalCents,650);

// Every supported currency retains native integer hundredths; CFA cannot contain fractional francs.
for(const currency of ['EUR','USD','GBP','XOF','XAF']){
 const whole=budget([tx('a',300),tx('b',300)],currency);
 assert.equal(I.suggestCategory(whole,300,valid,options).categoryId,'alimentation',currency);
 assert.equal(I.smallExpenseSummary(whole,{asOf,thresholdCents:300}).currency,currency);
 assert.equal(I.smallExpenseSummary(whole,{asOf,thresholdCents:300}).totalCents,600);
 const fractional=budget([tx('a',50),tx('b',50)],currency);
 assert.equal(I.suggestCategory(fractional,50,valid,options).categoryId,currency.startsWith('X')?'non-classee':'alimentation');
}
for(const invalidCurrency of ['JPY','eur',null]){
 const wrong=budget(repeated.transactions,invalidCurrency);
 assert.deepEqual(clean(I.frequentAmounts(wrong,options)),[]);
 assert.equal(I.suggestCategory(wrong,300,valid,options).confidence,'none');
}
for(const amount of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'300']){
 assert.equal(I.suggestCategory(repeated,amount,valid,options).confidence,'none');
 assert.deepEqual(clean(I.similarExpenses(repeated,{asOf,amountCents:amount})),[]);
}

// Predicted values never mutate a budget, its history, its categories, or its owner-scoped preferences.
const original=JSON.stringify(small),frozen=JSON.parse(original);
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;}
freeze(frozen);
I.suggestCategory(frozen,300,valid,options);I.frequentAmounts(frozen,options);I.similarExpenses(frozen,{asOf,amountCents:300});I.smallExpenseSummary(frozen,{asOf,thresholdCents:2500});
assert.equal(JSON.stringify(frozen),original);
assert.equal(I.suggestCategory(budget([], 'EUR'),300,valid,options).categoryId,'non-classee','An unrelated empty budget cannot inherit predictions');
console.log('PASS Express history: deterministic categorization, shortcuts, similar expenses, native currencies, per-category small spending and no writes');
