'use strict';const assert=require('node:assert/strict');const {test}=require('node:test');const api=require('./bank-demo.js');
test('aucune banque connectée au démarrage',()=>{const d=api.createDemo();assert.equal(d.accounts.filter(a=>a.connected).length,0);assert.equal(d.sync(),0);});
test('connexion et synchronisation fictive',()=>{const d=api.createDemo();d.connect('sg');assert.equal(d.sync(),4);assert.equal(d.list().length,4);});
test('synchronisation idempotente sans doublon',()=>{const d=api.createDemo();d.connect('sg');d.connect('revolut');assert.equal(d.sync(),6);assert.equal(d.sync(),0);assert.equal(d.list().length,6);});
test('virements internes exclus du revenu et des dépenses',()=>{const d=api.createDemo();d.connect('sg');d.connect('revolut');d.sync();assert.equal(d.summary().incomeCents,25000);assert.equal(d.summary().expenseCents,6049);});
test('déconnexion retire les transactions fictives de la banque',()=>{const d=api.createDemo();d.connect('sg');d.sync();d.disconnect('sg');assert.equal(d.list().length,0);});
test('banque inconnue refusée',()=>{const d=api.createDemo();assert.throws(()=>d.connect('inconnue'));});
