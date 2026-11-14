/* Pure Express transaction preparation. No storage, network or account session. */
(function(root){
  'use strict';
  const accountId='current-budget';
  function hasDefaultAccount(data){return data?.preferences?.express?.defaultAccountId===accountId;}
  function confirmDefaultAccount(data){
    if(!data||!data.initialized||!data.preferences||typeof data.preferences!=='object'||Array.isArray(data.preferences))throw Error('Configure ton budget avant de confirmer le compte Express.');
    if(data.expressSchema!==undefined&&data.expressSchema!==1)throw Error('Cette version Express nécessite une mise à jour de Clair.');
    data.preferences.express={defaultAccountId:accountId};data.expressSchema=1;
  }
  function prepareExpense(E,data,input){
    if(!data?.initialized||!Array.isArray(data.transactions))throw Error('Configure ton budget avant d’utiliser Dépense Express.');
    if(!hasDefaultAccount(data)||data.expressSchema!==1)throw Error('Confirme ton budget Clair pour utiliser Dépense Express.');
    const {id,rawAmount,createdAt,categoryId='non-classee'}=input||{};
    if(!E.safeId(id))throw Error('Identifiant de dépense Express invalide.');
    if(!E.safeId(categoryId)||['epargne','income'].includes(categoryId))throw Error('Choisis une catégorie de dépense valide.');
    if(typeof createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(createdAt)||!Number.isFinite(Date.parse(createdAt))||new Date(createdAt).toISOString()!==createdAt)throw Error('Date et heure Express invalides.');
    const date=E.dateAt(createdAt),currency=E.currencyCode(data.currency),amountCents=E.cents(rawAmount,currency);
    if(!E.validDate(date)||date<data.openingBalanceDate)throw Error('La date Express précède le début de ce budget.');
    if(amountCents<=0)throw Error('Indique un montant strictement positif.');
    return {id,type:'expense',amountCents,name:'Dépense Express',categoryId,date,note:'',autoKey:null,ruleId:null,fixedExpenseId:null,fixedMonth:null,corrected:false,paymentConfirmed:false,confirmedAt:null,earlyPaid:false,savingsProjectId:null,express:{source:'express',createdAt,originalCurrency:currency,accountId,idempotencyKey:id}};
  }
  function addExpense(E,data,input){
    const transaction=prepareExpense(E,data,input),matches=data.transactions.filter(t=>t.id===transaction.id||t.express?.idempotencyKey===transaction.express.idempotencyKey);
    if(matches.length){
      const old=matches[0],same=matches.length===1&&old.id===transaction.id&&['type','amountCents','name','categoryId','date','note'].every(k=>(old[k]??'')===(transaction[k]??''))&&['source','createdAt','originalCurrency','accountId','idempotencyKey'].every(k=>old.express?.[k]===transaction.express[k])&&!old.autoKey&&!old.savingsProjectId;
      if(!same)throw Error('Cette clé Express est déjà utilisée par une opération différente (collision).');
      return {created:false,transaction:old};
    }
    data.transactions.push(transaction);data.expressSchema=1;return {created:true,transaction};
  }
  root.ClairExpressCore={hasDefaultAccount,confirmDefaultAccount,prepareExpense,addExpense};
})(window);
