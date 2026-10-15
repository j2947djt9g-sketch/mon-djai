const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const ui=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][3][1];
const code=ui.slice(ui.indexOf('  function welcome(){'),ui.indexOf('  welcome();'));
function run({seen=false,user=false,local=false,recovery=false,reduced=false}={}){
 const handlers={},timers=[];let inits=0,renders=0,setups=0;
 const nodes=new Map();
 function $(key){if(!nodes.has(key))nodes.set(key,{open:false,addEventListener(type,fn){handlers[key+':'+type]=fn},showModal(){this.open=true},close(){this.open=false;handlers[key+':close']?.()}});return nodes.get(key)}
 const s={$,cloud:{enabled:!local,init:()=>{inits++;return Promise.resolve()}},data:{initialized:false},accountMode:'login',accountStarted:false,accountResetStep:recovery?'password':null,loadError:null,
 sessionStorage:{getItem:()=>seen?'1':null,setItem(){}},localStorage:{getItem:()=>user?'session':null},matchMedia:()=>({matches:reduced}),setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},render(){renders++},beginSetup(){setups++}};
 vm.createContext(s);vm.runInContext(code+'welcome();',s);
 return {s,nodes,handlers,timers,inits:()=>inits,renders:()=>renders,setups:()=>setups};
}
const signup=run();assert.equal(signup.nodes.get('#welcome').open,true);assert.equal(signup.timers.length,0);
signup.handlers['#welcome-skip:click']();assert.equal(signup.s.accountMode,'signup');assert.equal(signup.inits(),1);assert.equal(signup.renders(),1);
const login=run();login.handlers['#welcome-login:click']();assert.equal(login.s.accountMode,'login');assert.equal(login.inits(),1);
const returning=run({user:true});assert.equal(returning.timers.length,1);assert.equal(returning.nodes.get('#welcome-login').hidden,true);returning.timers[0]();assert.equal(returning.inits(),1);
for(const options of [{seen:true},{recovery:true},{reduced:true}]){const r=run(options);assert.equal(r.inits(),1);assert(!r.nodes.get('#welcome').open);}
const local=run({local:true});local.handlers['#welcome-skip:click']();assert.equal(local.setups(),1);
assert.match(html,/mascot\(\[2,1,2,3\]\[s\]/);assert.match(html,/mascot\(signup\?1:0/);
assert.match(html,/:has\(input:focus,select:focus,textarea:focus\)/);
const sw=fs.readFileSync(__dirname+'/../sw.js','utf8');assert.match(sw,/assets\/mascotte-poses.png/);assert.match(sw,/const HOME=new URL\('index.html',BASE\).href/);
assert(fs.existsSync(__dirname+'/../assets/mascotte-poses.png'));
console.log('PASS: explicit signup/login, returning session, recovery and reduced-motion bypass, local setup, four poses, compact input state and offline asset');
