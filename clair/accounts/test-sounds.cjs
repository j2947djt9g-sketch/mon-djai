const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/sounds.js','utf8'),html=fs.readFileSync(__dirname+'/../index.html','utf8');assert(html.includes(source.trimEnd()));
const sandbox={Promise,Set,Date};vm.createContext(sandbox);vm.runInContext(source+'\nthis.create=createSoundFeedback;',sandbox);
function setup({muted=false,resumeRejects=false,blockedStorage=false}={}){
 const values=new Map([['budget','untouched']]);if(muted)values.set('clair-sounds-v1','off');let time=100,visible=true,contexts=0,resumes=0,release=null;
 const tones=[],param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Audio{constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};}resume(){resumes++;if(resumeRejects)return Promise.reject(Error('blocked'));if(release)return new Promise(resolve=>release.push(()=>{this.state='running';resolve()}));this.state='running';return Promise.resolve();}createOscillator(){const entry={stopped:false},frequency=param();frequency.setValueAtTime=value=>entry.frequency=value;return {frequency,connect(){},disconnect(){},start(){tones.push(entry)},stop(){entry.stopped=true}};}createGain(){return {gain:param(),connect(){},disconnect(){}};}}
 const scope={AudioContext:Audio,performance:{now:()=>time}},storage={getItem:key=>{if(blockedStorage)throw Error('blocked');return values.get(key)||null},setItem:(key,value)=>{if(blockedStorage)throw Error('blocked');values.set(key,value)}};
 const controller=sandbox.create(scope,storage,()=>visible);return {controller,values,tones,scope,time:value=>time=value,visible:value=>visible=value,contexts:()=>contexts,resumes:()=>resumes,hold(){release=[];return ()=>{for(const fn of release)fn();release=null}}};
}
(async()=>{
 const a=setup(),s=a.controller;assert(s.enabled());assert.equal(a.contexts(),0);await s.saved();assert.equal(a.contexts(),0,'Background work never creates an audio context');
 await s.selection();assert.equal(a.contexts(),1);assert.equal(a.tones.length,1);assert.equal(a.tones[0].frequency,680);await s.saved();assert.equal(a.tones.length,1,'A navigation click cannot announce a successful save');
 s.saveIntent();await s.saved();assert.deepEqual(a.tones.slice(-2).map(t=>t.frequency),[660,880]);assert.equal(a.contexts(),1,'Reuse the audio context');const after=a.tones.length;await s.saved();assert.equal(a.tones.length,after,'One confirmation per save');
 s.saveIntent();s.cancelSave();await s.saved();assert.equal(a.tones.length,after,'A rejected operation stays silent');s.saveIntent();a.time(2201);await s.saved();assert.equal(a.tones.length,after,'Expired actions do not play late');
 assert(s.setEnabled(false));assert.equal(a.values.get('clair-sounds-v1'),'off');a.time(3000);await s.selection();await s.preview();assert.equal(a.tones.length,after);assert(a.tones.every(t=>t.stopped));assert.equal(a.values.get('budget'),'untouched');
 const muted=setup({muted:true});await muted.controller.selection();assert.equal(muted.contexts(),0,'A persisted mute never creates a context');muted.controller.setEnabled(true);await muted.controller.preview();assert.equal(muted.tones.length,2);
 const pending=setup(),resume=pending.hold(),play=pending.controller.selection();pending.controller.setEnabled(false);resume();await play;assert.equal(pending.tones.length,0,'Muting cancels a pending resume');
 const hidden=setup();hidden.visible(false);await hidden.controller.selection();assert.equal(hidden.contexts(),0);hidden.visible(true);await hidden.controller.preview();hidden.controller.pause();assert(hidden.tones.every(t=>t.stopped));
 const rejected=setup({resumeRejects:true});assert.equal(await rejected.controller.selection(),false);assert.equal(rejected.tones.length,0);
 const blocked=setup({blockedStorage:true});assert.equal(blocked.controller.enabled(),false);assert.equal(blocked.controller.setEnabled(false),false);await blocked.controller.selection();assert.equal(blocked.contexts(),0);
 const unsupported=setup();delete unsupported.scope.AudioContext;assert.equal(unsupported.controller.supported(),false);assert.equal(await unsupported.controller.preview(),false);
 a.values.set('clair-sounds-v1','off');s.refresh();assert(!s.enabled());assert.equal(a.values.get('budget'),'untouched');
 console.log('PASS sound feedback: gesture-only startup, context reuse, successful-save intent, mute persistence, rejected/expired writes, pending resume cancellation, background, unsupported audio and unchanged budget');
})().catch(error=>{console.error(error);process.exitCode=1});
