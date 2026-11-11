(function(root){
  'use strict';
  // Read only the supplied budget. Amounts stay in its native integer hundredths.
  const currencyCodes=new Set(['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF']);
  const builtInCategories=['alimentation','logement','transport','telephone','etudes','hygiene','vetements','famille','loisirs','abonnements','imprevus','autre','non-classee'];
  const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  const expenseCategory=value=>safeId(value)&&value!=='epargne'&&value!=='income';
  const order=(a,b)=>a<b?-1:a>b?1:0;
  function currencyOf(data){
    if(!data||typeof data!=='object')return null;
    const code=data.currency===undefined?'EUR':data.currency;
    return currencyCodes.has(code)?code:null;
  }
  function validAmount(value,currency){
    return currency!==null&&Number.isSafeInteger(value)&&value>0&&value<=10000000000&&(!currency.startsWith('X')||value%100===0);
  }
  function validDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'2000-01-01'||value>'2100-12-31')return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
  }
  function history(data,options,defaultDays){
    const currency=currencyOf(data),asOf=options.asOf,lookbackDays=options.lookbackDays===undefined?defaultDays:options.lookbackDays;
    const empty={currency,fromDate:null,toDate:validDate(asOf)?asOf:null,transactions:[]};
    if(!currency||!validDate(asOf)||!Number.isSafeInteger(lookbackDays)||lookbackDays<1||lookbackDays>36600||!Array.isArray(data.transactions)||data.transactions.length>50000)return empty;
    const fromDate=new Date(+new Date(asOf+'T12:00:00Z')-(lookbackDays-1)*86400000).toISOString().slice(0,10);
    const transactions=data.transactions.filter(t=>t&&t.type==='expense'&&validAmount(t.amountCents,currency)&&validDate(t.date)&&t.date>=fromDate&&t.date<=asOf&&t.categoryId!=='epargne'&&t.categoryId!=='income'&&!t.savingsProjectId&&!t.autoKey&&!t.ruleId&&!t.fixedExpenseId&&(t.currency===undefined||t.currency===currency));
    return {currency,fromDate,toDate:asOf,transactions};
  }
  function categoriesOf(data,explicit){
    const values=Array.isArray(explicit)?explicit:[...builtInCategories,...(Array.isArray(data?.customCategories)?data.customCategories.map(c=>c?.id):[])];
    return new Set(values.filter(expenseCategory));
  }
  function categoryResult(transactions,validCategories,minSamples=2,minShare=.75){
    const result={categoryId:'non-classee',confidence:'none',sampleCount:transactions.length};
    if(!Number.isSafeInteger(minSamples)||minSamples<2||!Number.isFinite(minShare)||minShare<=.5||minShare>1||transactions.length<minSamples)return result;
    const counts=new Map();
    for(const t of transactions){if(validCategories.has(t.categoryId)&&t.categoryId!=='non-classee')counts.set(t.categoryId,(counts.get(t.categoryId)||0)+1);}
    const ranked=[...counts].sort((a,b)=>b[1]-a[1]||order(a[0],b[0])),winner=ranked[0];
    // Unknown and deleted categories remain in the denominator of this evidence.
    if(winner&&winner[1]>=minSamples&&winner[1]/transactions.length>=minShare&&(!ranked[1]||winner[1]>ranked[1][1]))return {categoryId:winner[0],confidence:'history',sampleCount:transactions.length};
    return result;
  }
  function expressSuggestCategory(data,amountCents,validCategoryIds,options={}){
    options=options||{};
    const h=history(data,options,90);
    if(!validAmount(amountCents,h.currency)||!Array.isArray(validCategoryIds))return {categoryId:'non-classee',confidence:'none',sampleCount:0};
    return categoryResult(h.transactions.filter(t=>t.amountCents===amountCents),categoriesOf(data,validCategoryIds),options.minSamples===undefined?2:options.minSamples,options.minShare===undefined?.75:options.minShare);
  }
  function expressFrequentAmounts(data,options={}){
    options=options||{};
    const h=history(data,options,90),limit=options.limit===undefined?4:options.limit,minCount=options.minCount===undefined?2:options.minCount;
    if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(minCount)||minCount<1)return [];
    const groups=new Map(),validCategories=categoriesOf(data,options.validCategoryIds);
    for(const t of h.transactions){if(!groups.has(t.amountCents))groups.set(t.amountCents,[]);groups.get(t.amountCents).push(t);}
    return [...groups].filter(([,list])=>list.length>=minCount).map(([amountCents,list])=>({amountCents,count:list.length,lastDate:list.reduce((latest,t)=>t.date>latest?t.date:latest,''),categoryId:categoryResult(list,validCategories).categoryId})).sort((a,b)=>b.count-a.count||order(b.lastDate,a.lastDate)||a.amountCents-b.amountCents).slice(0,limit);
  }
  function expressSimilarExpenses(data,options={}){
    options=options||{};
    const h=history(data,options,90),limit=options.limit===undefined?5:options.limit;
    if(!validAmount(options.amountCents,h.currency)||!Number.isSafeInteger(limit)||limit<1)return [];
    return h.transactions.filter(t=>t.amountCents===options.amountCents&&(options.categoryId===undefined||t.categoryId===options.categoryId)).slice().sort((a,b)=>order(b.date,a.date)||order(String(a.id||''),String(b.id||''))).slice(0,limit).map(t=>({id:safeId(t.id)?t.id:'',amountCents:t.amountCents,categoryId:expenseCategory(t.categoryId)?t.categoryId:'non-classee',date:t.date,name:typeof t.name==='string'?t.name:''}));
  }
  function expressSmallExpenseSummary(data,options={}){
    options=options||{};
    const h=history(data,options,30),thresholdCents=validAmount(options.thresholdCents,h.currency)?options.thresholdCents:null;
    const result={currency:h.currency,fromDate:h.fromDate,toDate:h.toDate,thresholdCents,count:0,totalCents:0,expenseCount:h.transactions.length,expenseTotalCents:0,byCategory:[]};
    const groups=new Map(),validCategories=categoriesOf(data,options.validCategoryIds);
    for(const t of h.transactions){
      result.expenseTotalCents+=t.amountCents;
      if(thresholdCents===null||t.amountCents>thresholdCents)continue;
      result.count++;result.totalCents+=t.amountCents;
      const categoryId=validCategories.has(t.categoryId)?t.categoryId:'non-classee';
      if(!groups.has(categoryId))groups.set(categoryId,{categoryId,count:0,totalCents:0});
      const category=groups.get(categoryId);category.count++;category.totalCents+=t.amountCents;
    }
    result.byCategory=[...groups.values()].sort((a,b)=>b.totalCents-a.totalCents||order(a.categoryId,b.categoryId));
    return result;
  }
  root.ClairExpressInsights=Object.freeze({suggestCategory:expressSuggestCategory,frequentAmounts:expressFrequentAmounts,similarExpenses:expressSimilarExpenses,smallExpenseSummary:expressSmallExpenseSummary});
})(typeof window!=='undefined'?window:globalThis);
