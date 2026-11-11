  // Frozen European Commission InforEuro accounting reference, November 2026.
  // Exact EUR-base integers (scale 100000); provenance: exchange-rates-v2.json.
  const exchangePolicy=Object.freeze({id:'inforeuro-2026-11',period:'novembre 2026',perEuro:Object.freeze({EUR:100000,USD:111300,GBP:83578,MAD:1098365,CAD:155770,CHF:92220,XOF:65595700,XAF:65595700})});
  function exchangeRate(from,to){
    from=currencyCode(from);to=currencyCode(to);if(from===to)return 1;
    if(!own(exchangePolicy.perEuro,from)||!own(exchangePolicy.perEuro,to))throw Error('Aucun taux de change vérifié n’est disponible pour cette devise. Ton budget est conservé.');
    return exchangePolicy.perEuro[to]/exchangePolicy.perEuro[from];
  }
  function exchangeAmount(value,from,to){
    if(!Number.isSafeInteger(value))throw Error('Montant invalide pour la conversion.');
    from=currencyCode(from);to=currencyCode(to);exchangeRate(from,to);
    if(from===to){if(Math.abs(value)>10000000000)throw Error('Un montant converti dépasse la capacité du budget.');return value;}
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
