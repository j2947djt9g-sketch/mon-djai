const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)][0][1],ctx={window:{},Intl,Date};
vm.createContext(ctx);vm.runInContext(script,ctx);const E=ctx.window.ClairEngine;
const legacy=E.empty();delete legacy.currency;assert.equal(E.normalize(legacy).currency,'EUR');
for(const code of ['EUR','USD','XOF','XAF']){
 const d=E.empty();d.currency=code;d.initialized=d.setupDone=true;d.openingCents=10000000;
 const clean=E.normalize(JSON.parse(JSON.stringify(d)));assert.equal(clean.currency,code);assert.equal(clean.openingCents,d.openingCents);
 assert.equal(E.cents('1500',code),150000);assert.equal(E.inputAmount(150000,code),code.startsWith('X')?'1500':'1500,00');
 assert.equal(E.formatMoney(150000,code),new Intl.NumberFormat('fr-FR',{style:'currency',currency:code}).format(1500));
 if(code.startsWith('X')){assert.throws(()=>E.cents('1,25',code));clean.openingCents=101;assert.throws(()=>E.validateCurrency(clean));}
 else assert.equal(E.cents('1,25',code),125);
}
assert.throws(()=>E.currencyCode('GBP'));console.log('PASS four currencies: parsing, formatting, integer CFA, legacy EUR and lossless backup round trips');
