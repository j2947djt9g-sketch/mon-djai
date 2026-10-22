const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),ui=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][3][1];
const code=ui.slice(ui.indexOf('  function welcome(){'),ui.indexOf('  welcome();'));
function run({user=false,local=false,recovery=false,reduced=false,slow=false}={}){
 const handlers={},timers=[],motion={matches:reduced,addEventListener(type,fn){handlers['motion:'+type]=fn},removeEventListener(){}};let inits=0,renders=0,setups=0;
 const nodes=new Map();function $(key){if(!nodes.has(key))nodes.set(key,{open:false,classList:{values:new Set(),add(c){this.values.add(c)},contains(c){return this.values.has(c)}},addEventListener(type,fn){handlers[key+':'+type]=fn},showModal(){this.open=true},close(){this.open=false;handlers[key+':close']?.()}});return nodes.get(key);}
 const cloud={enabled:!local,ready:false,status:'loading',user:user?{id:'test'}:null,init(){inits++;if(!slow){this.ready=true;this.status=user?'synced':'signed-out';}return Promise.resolve();}};
 const s={$,cloud,data:{initialized:false},accountMode:'login',accountStarted:false,startupController:null,accountResetStep:recovery?'password':null,accountDeferredSetup:false,loadError:null,matchMedia:()=>motion,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(id){if(timers[id-1])timers[id-1].cancelled=true;},render(){renders++},beginSetup(){setups++;}};
 vm.createContext(s);vm.runInContext(code+'welcome();',s);return {s,nodes,handlers,timers,inits:()=>inits,renders:()=>renders,setups:()=>setups};
}
const first=run();assert(first.nodes.get('#welcome').open);assert.equal(first.inits(),1);assert(first.nodes.get('#welcome').classList.contains('splash-full'));assert.equal(first.timers[0].ms,3150);first.timers[0].fn();assert(first.nodes.get('#welcome').open);assert.equal(first.timers[2].ms,350);first.timers[2].fn();assert(!first.nodes.get('#welcome').open);assert.equal(first.s.startupController.active,false);first.handlers['#welcome:close']();assert.equal(first.inits(),1);
const returning=run({user:true});assert.equal(returning.inits(),1);assert.equal(returning.timers[0].ms,3150);returning.timers[0].fn();returning.timers[2].fn();assert(!returning.nodes.get('#welcome').open);
const slow=run({user:true,slow:true});slow.timers[0].fn();assert(slow.nodes.get('#welcome').open);assert.equal(slow.timers.length,2);slow.s.cloud.ready=true;slow.s.cloud.status='synced';slow.s.startupController.refresh();slow.timers[2].fn();assert(!slow.nodes.get('#welcome').open);assert.equal(slow.inits(),1);
const timeout=run({slow:true});timeout.timers[1].fn();assert(!timeout.nodes.get('#welcome').open);assert.equal(timeout.renders(),1);
const reduced=run({reduced:true});assert.equal(reduced.timers[0].ms,150);reduced.timers[0].fn();assert(!reduced.nodes.get('#welcome').open);
const recovery=run({recovery:true});assert.equal(recovery.inits(),1);assert(!recovery.nodes.get('#welcome').open);assert.equal(recovery.timers.length,0);
const changed=run();changed.handlers['motion:change']({matches:true});assert(!changed.nodes.get('#welcome').open);assert.equal(changed.inits(),1);
const escape=run();escape.handlers['#welcome:cancel']({preventDefault(){}});assert(!escape.nodes.get('#welcome').open);assert.equal(escape.inits(),1);
const local=run({local:true});local.timers[0].fn();local.timers[2].fn();assert.equal(local.setups(),1);assert.equal(local.inits(),0);
const welcome=html.match(/<dialog id="welcome"[\s\S]*?<\/dialog>/)[0];assert.doesNotMatch(welcome,/<button|welcome-preview|mascot/);assert.match(welcome,/aria-label="Clair"/);assert.match(welcome,/<title>LAIR<\/title>/);assert.match(welcome,/<mask id="splash-reveal"/);
assert.match(html,/mascot\(\[2,1,2,3\]\[s\]/);assert.match(html,/mascot\(signup\?1:0/);assert.match(html,/dialog:has\(form\) \.mascot-pose/);assert.doesNotMatch(html,/dialog:has\(input:focus/);
const sw=fs.readFileSync(__dirname+'/../sw.js','utf8');for(const name of ['01-bienvenue.png','02-serenite.png','03-vigilance.png','04-prevision-tendue.png','05-solde-zero.png','06-solde-negatif-v2.webp'])assert(sw.includes('assets/mascotte/'+name));
assert(html.includes(fs.readFileSync(__dirname+'/welcome.css','utf8').trimEnd()));
console.log('PASS 3.5-second C + LAIR opening, concurrent single auth initialization, slow-session hold, bounded wait, reduced motion, recovery, Escape and local setup');
console.log('PASS static form geometry and preserved account mascots/offline assets');
