'use strict';
const demo=window.ClairBankDemo.createDemo();
const euro=cents=>(cents/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const node=id=>document.getElementById(id);
function render(){
const connected=demo.accounts.filter(a=>a.connected);
node('balance').textContent=euro(demo.summary().connectedBalanceCents);
node('connected-count').textContent=connected.length+' banque(s) fictive(s) connectée(s)';
node('banks').replaceChildren();
for(const a of demo.accounts){const row=document.createElement('div');row.className='item';const info=document.createElement('div');const name=document.createElement('div');name.className='name';name.textContent=a.name;const sub=document.createElement('div');sub.className='muted';sub.textContent=a.connected?'Connectée • '+euro(a.balanceCents):'Non connectée';info.append(name,sub);const btn=document.createElement('button');btn.className=a.connected?'secondary':'';btn.textContent=a.connected?'Déconnecter':'Connecter';btn.addEventListener('click',()=>{a.connected?demo.disconnect(a.id):demo.connect(a.id);node('status').textContent=a.connected?'Banque fictive connectée.':'Banque fictive déconnectée.';render();});row.append(info,btn);node('banks').append(row);}
const s=demo.summary();node('income').textContent=euro(s.incomeCents);node('expenses').textContent=euro(s.expenseCents);
node('transactions').replaceChildren();const tx=demo.list();if(!tx.length){node('transactions').textContent='Aucune transaction pour le moment.';node('transactions').className='empty';}else{node('transactions').className='';for(const t of tx){const row=document.createElement('div');row.className='item';const left=document.createElement('div');const name=document.createElement('div');name.className='name';name.textContent=t.label;const sub=document.createElement('div');sub.className='muted';sub.textContent=t.date+' • '+t.category+' • '+t.accountId;left.append(name,sub);const amt=document.createElement('div');amt.className='amount'+(t.amountCents>0?' positive':'');amt.textContent=euro(t.amountCents);row.append(left,amt);node('transactions').append(row);}}}
node('sync').addEventListener('click',()=>{const added=demo.sync();node('status').textContent=added+' nouvelle(s) opération(s) fictive(s) importée(s).';render();});
node('reset').addEventListener('click',()=>{for(const a of demo.accounts)demo.disconnect(a.id);node('status').textContent='Démonstration réinitialisée.';render();});render();