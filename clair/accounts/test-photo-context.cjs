const {test}=require('node:test'),assert=require('node:assert/strict'),app=require('./budget-test-harness.cjs');
function ready(){
 const a=app(),images=[],revoked=[];a.t.setRender(()=>{});a.t.setNotify(()=>{});a.t.setPush(()=>{});a.t.setSound(()=>{});
 a.sandbox.URL={createObjectURL:()=>`blob:${images.length}`,revokeObjectURL:u=>revoked.push(u)};
 a.sandbox.Image=class{constructor(){this.naturalWidth=this.naturalHeight=1;images.push(this)}};
 a.sandbox.document.createElement=()=>{let img;return {getContext:()=>({drawImage:i=>img=i}),toDataURL:()=>img.photo}};
 const choose=()=>a.events.change({target:{dataset:{},files:[{type:'image/png',size:100}],matches:s=>s==='[data-photo]'}});
 const finish=(i,photo='data:image/jpeg;base64,YQ==')=>{images[i].photo=photo;images[i].onload()};
 return Object.assign(a,{images,revoked,choose,finish});
}
test('delayed photo never reaches an adopted budget',async()=>{const a=ready(),pending=a.choose(),b=structuredClone(a.t.getData());b.openingCents=222200;a.t.setData(b);const before=a.t.getSnapshot();a.finish(0);await pending;assert.equal(a.t.getSnapshot(),before);assert.equal(a.t.getData().preferences.photo,null);assert.equal(a.revoked.length,1)});
test('last photo selection wins even if first decode finishes last',async()=>{const a=ready(),first=a.choose(),last=a.choose();a.finish(1,'data:image/jpeg;base64,Yg==');await last;a.finish(0);await first;assert.equal(a.t.getData().preferences.photo,'data:image/jpeg;base64,Yg==');assert.equal(a.revoked.length,2)});
for(const change of ['epoch','owner','currency','storage','conversion','conflict'])test(`delayed photo is rejected after ${change} changes`,async()=>{
 const a=ready(),pending=a.choose();
 if(change==='epoch')a.t.cloud.epoch++;
 if(change==='owner')a.t.cloud.user={id:'fictional-b'};
 if(change==='currency'){const b=structuredClone(a.t.getData());b.currency='USD';a.t.setData(b)}
 if(change==='storage'){const key=[...a.storage.keys()][0],b=JSON.parse(a.storage.get(key));b.openingCents++;a.storage.set(key,JSON.stringify(b))}
 if(change==='conversion')a.t.cloud.converting=true;
 if(change==='conflict')a.t.cloud.conflict={};
 const before=JSON.stringify([...a.storage]);a.finish(0);await pending;assert.equal(JSON.stringify([...a.storage]),before);assert.equal(a.t.getData().preferences.photo,null);assert.equal(a.revoked.length,1);
});
test('decode error releases URL and a later selection succeeds',async()=>{const a=ready(),bad=a.choose();a.images[0].onerror();await bad;assert.equal(a.t.getData().preferences.photo,null);const good=a.choose();a.finish(1);await good;assert.equal(a.t.getData().preferences.photo,'data:image/jpeg;base64,YQ==');assert.equal(a.revoked.length,2)});
test('visibility refresh preserves a legitimate pending photo',async()=>{const a=ready(),pending=a.choose();a.sandbox.document.hidden=false;await a.events.visibilitychange();a.finish(0);await pending;assert.equal(a.t.getData().preferences.photo,'data:image/jpeg;base64,YQ==')});
