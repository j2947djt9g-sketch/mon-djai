  // Eurostat/ECB annual EUR/USD averages, 2016–2025, equally weighted by year.
  // EUR/CFA official fixed parity: 655.957 XOF or XAF per EUR (French Treasury).
  // Sources and method: clair/accounts/exchange-rates.json.
  const exchangePolicy=Object.freeze({id:'annual-mean-2016-2025',period:'2016–2025',usdAnnual:Object.freeze([1.1069,1.1297,1.1810,1.1195,1.1422,1.1827,1.0530,1.0813,1.0824,1.1300]),perEuro:Object.freeze({EUR:100000,USD:112087,XOF:65595700,XAF:65595700})});
  function exchangeRate(from,to){return exchangePolicy.perEuro[currencyCode(to)]/exchangePolicy.perEuro[currencyCode(from)];}
  function exchangeAmount(value,from,to){
    if(!Number.isSafeInteger(value))throw Error('Montant invalide pour la conversion.');
    const q=currencies[currencyCode(to)].digits===0?100n:1n;
    const a=BigInt(Math.abs(value))*BigInt(exchangePolicy.perEuro[currencyCode(to)]),b=BigInt(exchangePolicy.perEuro[currencyCode(from)])*q;
    const result=Number(((a*2n+b)/(2n*b))*q)*(value<0?-1:1);
    if(!Number.isSafeInteger(result)||Math.abs(result)>10000000000)throw Error('Un montant converti dépasse la capacité du budget.');
    if(value!==0&&result===0)throw Error('Un montant est trop faible pour être conservé dans cette devise. La conversion est annulée.');
    return result;
  }
  function convertCurrency(input,to,asOf=today()){
    const d=normalize(input),from=d.currency;to=currencyCode(to);if(to===from)return d;
    if(!d.initialized||!validDate(asOf))throw Error('Configure ton budget avant de changer sa devise.');
    const out=JSON.parse(JSON.stringify(d)),convert=n=>exchangeAmount(n,from,to),major=n=>convert(cents(n,from))/100;
    out.currency=to;out.currencyRevision=(d.currencyRevision||0)+1;
    out.openingCents=convert(d.openingCents);
    out.transactions.forEach(t=>{t.amountCents=convert(t.amountCents);});
    out.rules.forEach(r=>{r.amountCents=convert(r.amountCents);r.amounts=r.amounts.map(convert);});
    out.savingsProjects.forEach(p=>{p.targetCents=convert(p.targetCents);});
    out.fixedExpenses.forEach(x=>{x.amount=major(x.amount);});out.savingsGoal=major(d.savingsGoal);
    out.budgets=Object.fromEntries(Object.entries(d.budgets).map(([k,n])=>[k,major(n)]));
    out.budgetOverrides=Object.fromEntries(Object.entries(d.budgetOverrides).map(([m,o])=>[m,Object.fromEntries(Object.entries(o).map(([k,n])=>[k,major(n)]))]));
    // Reconcile the rounded ledger with the directly converted balance today.
    out.openingCents+=convert(balance(d,asOf))-balance(out,asOf);
    return normalize(out);
  }
