/* CLAIR Open Banking demo: fictitious data only. No network calls. */
(function(root){
'use strict';
const initialAccounts=[
{id:'sg',name:'Société Générale (fictif)',balanceCents:125075,currency:'EUR'},
{id:'revolut',name:'Revolut (fictif)',balanceCents:160000,currency:'EUR'}];
const fixture=[
{id:'demo-001',accountId:'sg',date:'2026-11-01',label:'Courses alimentaires',amountCents:-3250},
{id:'demo-002',accountId:'sg',date:'2026-11-02',label:'Transport Irigo',amountCents:-2200},
{id:'demo-003',accountId:'sg',date:'2026-11-03',label:'Virement reçu',amountCents:25000},
{id:'demo-004',accountId:'sg',date:'2026-11-04',label:'Virement vers Revolut',amountCents:-10000,transferGroup:'internal-001'},
{id:'demo-005',accountId:'revolut',date:'2026-11-04',label:'Virement depuis Société Générale',amountCents:10000,transferGroup:'internal-001'},
{id:'demo-006',accountId:'revolut',date:'2026-11-04',label:'Abonnement musique',amountCents:-599}
];
function categorize(t){if(t.transferGroup)return 'Virement interne';const s=t.label.toLowerCase();if(/course|aliment/.test(s))return 'Alimentation';if(/transport|irigo/.test(s))return 'Transport';if(/abonnement|musique/.test(s))return 'Abonnements';if(t.amountCents>0)return 'Revenus';return 'Autres';}
function createDemo(){const accounts=initialAccounts.map(x=>({...x,connected:false}));const transactions=new Map();return {
accounts,transactions,
connect(id){const a=accounts.find(x=>x.id===id);if(!a)throw Error('Banque fictive inconnue');a.connected=true;return a;},
disconnect(id){const a=accounts.find(x=>x.id===id);if(!a)return false;a.connected=false;for(const [key,t] of transactions)if(t.accountId===id)transactions.delete(key);return true;},
sync(){let added=0;for(const t of fixture){if(!accounts.find(a=>a.id===t.accountId)?.connected)continue;const key=t.accountId+':'+t.id;if(!transactions.has(key)){transactions.set(key,{...t,category:categorize(t)});added++;}}return added;},
list(){return [...transactions.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));},
summary(){const list=this.list();return {incomeCents:list.filter(t=>t.amountCents>0&&!t.transferGroup).reduce((n,t)=>n+t.amountCents,0),expenseCents:list.filter(t=>t.amountCents<0&&!t.transferGroup).reduce((n,t)=>n-t.amountCents,0),connectedBalanceCents:accounts.filter(a=>a.connected).reduce((n,a)=>n+a.balanceCents,0)};}
};}
root.ClairBankDemo={createDemo,categorize,fixture};
})(typeof module!=='undefined'&&module.exports?module.exports:window);
