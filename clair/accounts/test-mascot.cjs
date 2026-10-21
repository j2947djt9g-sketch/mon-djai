const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const ui=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][3][1];
const code=ui.slice(ui.indexOf('  function welcome(){'),ui.indexOf('  welcome();'));
function run({seen=false,user=false,local=false,recovery=false,reduced=false}={}){
 const handlers={},timers=[],motion={matches:reduced,addEventListener(type,fn){handlers['motion:'+type]=fn}};let inits=0,renders=0,setups=0;
 const nodes=new Map();
 function $(key){if(!nodes.has(key))nodes.set(key,{open:false,classList:{values:new Set(),add(c){this.values.add(c)},remove(c){this.values.delete(c)},contains(c){return this.values.has(c)}},addEventListener(type,fn){handlers[key+':'+type]=fn},showModal(){this.open=true},close(){this.open=false;handlers[key+':close']?.()}});return nodes.get(key)}
 const s={$,cloud:{enabled:!local,init:()=>{inits++;return Promise.resolve()}},data:{initialized:false},accountMode:'login',accountStarted:false,accountResetStep:recovery?'password':null,loadError:null,
 sessionStorage:{getItem:()=>seen?'1':null,setItem(){}},localStorage:{getItem:()=>user?'session':null},matchMedia:()=>motion,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(id){if(timers[id-1])timers[id-1].cancelled=true;},render(){renders++},beginSetup(){setups++}};
 vm.createContext(s);vm.runInContext(code+'welcome();',s);
 return {s,nodes,handlers,timers,inits:()=>inits,renders:()=>renders,setups:()=>setups};
}

const first=run();assert.equal(first.nodes.get('#welcome').open,true);assert(first.nodes.get('#welcome').classList.contains('splash-full'));assert.equal(first.timers[0].ms,2000);assert.equal(first.inits(),0);
first.timers[0].fn();assert.equal(first.nodes.get('#welcome').open,false);assert.equal(first.inits(),1);assert.equal(first.s.accountMode,'login');first.timers[0].fn();first.handlers['#welcome:close']();assert.equal(first.inits(),1);
const returning=run({seen:true,user:true});assert(returning.nodes.get('#welcome').classList.contains('splash-quick'));assert.equal(returning.timers[0].ms,450);returning.timers[0].fn();assert.equal(returning.inits(),1);
const reduced=run({reduced:true});assert(reduced.nodes.get('#welcome').classList.contains('splash-static'));assert.equal(reduced.timers[0].ms,150);reduced.timers[0].fn();assert.equal(reduced.inits(),1);
const recovery=run({recovery:true});assert.equal(recovery.inits(),1);assert(!recovery.nodes.get('#welcome').open);assert.equal(recovery.timers.length,0);
const changed=run();changed.handlers['motion:change']({matches:true});assert(!changed.nodes.get('#welcome').open);assert.equal(changed.inits(),1);assert.equal(changed.timers[0].cancelled,true);
const escape=run();escape.handlers['#welcome:cancel']();assert(!escape.nodes.get('#welcome').open);assert.equal(escape.inits(),1);
const local=run({local:true});assert.equal(local.setups(),0);local.timers[0].fn();assert.equal(local.setups(),1);
const welcome=html.match(/<dialog id="welcome"[\s\S]*?<\/dialog>/)[0];assert.doesNotMatch(welcome,/248|€|<button|welcome-preview|mascot/);assert.match(welcome,/<h1[^>]*>Clair<\/h1>/);assert.match(welcome,/Ton budget, l’esprit tranquille\./);assert.match(welcome,/<mask id="splash-reveal"/);
assert.match(html,/mascot\(\[2,1,2,3\]\[s\]/);assert.match(html,/mascot\(signup\?1:0/);
const sw=fs.readFileSync(__dirname+'/../sw.js','utf8');
for(const name of ['01-bienvenue.png','02-serenite.png','03-vigilance.png','04-prevision-tendue.png','05-solde-zero.png','06-solde-negatif-v2.webp']){assert(sw.includes('assets/mascotte/'+name));assert(fs.existsSync(__dirname+'/../assets/mascotte/'+name));}
assert(html.includes(fs.readFileSync(__dirname+'/welcome.css','utf8').trimEnd()));
console.log('PASS automatic Ruban opening: two seconds, brief returns, reduced motion, recovery bypass, local setup, Escape, and exactly one account initialization');
console.log('PASS sample balance/buttons removed; account mascot and offline assets preserved');
