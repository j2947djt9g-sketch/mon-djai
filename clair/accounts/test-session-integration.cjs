const assert=require('node:assert/strict');
const {test}=require('node:test');
const app=require('./budget-test-harness.cjs');
function account(){
 const a=app();
 Object.assign(a.t.cloud,{enabled:true,user:{id:'fixture-a'},ready:true,status:'synced'});
 a.t.setData(a.t.getData());
 return a;
}
test('generated HTML fails when a new canonical module is omitted; no reinjection',()=>{
 for(const source of ['application/budget-commands','application/budget-session','ui/navigation','ui/page-host','accounts/journal-ui']) assert.throws(()=>app({omit:'clair/'+source+'.js'}),/undefined|validateBudgetCandidate|create|Missing canonical|not defined/);
});
test('committed callback, snapshot and subscriber references cannot alter state or cache',()=>{
 const a=account();let retained;
 assert.equal(a.t.commit(d=>{retained=d;d.openingCents+=123;}),true);
 const saved=a.storage.get(a.t.key());
 retained.openingCents=1;
 const snapshot=a.t.session.getSnapshot();snapshot.openingCents=2;
 assert.equal(a.t.session.getSnapshot().openingCents,1000123);
 assert.equal(a.t.getData().openingCents,1000123);
 assert.equal(a.storage.get(a.t.key()),saved);
 assert.equal(a.t.cloud.record.payload.openingCents,1000123);
});
test('stale commit and storage event reject another owner cache without adopting or writing',()=>{
 for(const event of [false,true]){
  const a=account(),before=JSON.stringify(a.t.session.getSnapshot()),raw=a.t.getSnapshot();
  const foreign={...a.E.empty(),openingCents:999,_cloud:{userId:'fixture-b',revision:1,dirty:false,operationId:'foreign'}};
  const serialized=JSON.stringify(foreign);a.storage.set(a.t.key(),serialized);
  if(event)a.windowEvents.storage({key:a.t.key(),newValue:serialized});
  else assert.equal(a.t.commit(d=>{d.openingCents=10;}),false);
  assert.equal(JSON.stringify(a.t.session.getSnapshot()),before);
  assert.equal(a.t.getSnapshot(),raw);
  assert.equal(a.storage.get(a.t.key()),serialized);
 }
});
test('remote application is fenced by owner and epoch; matching metadata ACK adopts safely',()=>{
 const a=account(),context=a.t.session.getContext(),next=a.t.session.getSnapshot();
 next.openingCents=4321;
 const before=JSON.stringify(a.t.getData());
 for(const invalid of [{owner:'fixture-b',epoch:context.epoch},{owner:context.owner,epoch:context.epoch-1}]){
  a.t.cloud.hooks.apply(next,'foreign',invalid);
  assert.equal(JSON.stringify(a.t.getData()),before);
 }
 const raw=JSON.stringify({...next,_cloud:{userId:context.owner,revision:9,dirty:false,operationId:'ack'}});
 a.t.cloud.hooks.apply(next,raw,context);next.openingCents=1;
 assert.equal(a.t.getData().openingCents,4321);
 assert.equal(a.t.getSnapshot(),raw);
});
test('stale account cache adoption retains its CAS revision and pending operation metadata',()=>{
 const a=account(),next=a.t.session.getSnapshot();next.openingCents=6543;
 const metadata={userId:'fixture-a',revision:22,dirty:true,operationId:'other-tab'};
 const raw=JSON.stringify({...next,_cloud:metadata});a.storage.set(a.t.key(),raw);
 assert.equal(a.t.commit(d=>{d.openingCents=1;}),false);
 assert.equal(a.t.session.getSnapshot().openingCents,6543);
 assert.equal(JSON.stringify(a.t.cloud.record.meta),JSON.stringify(metadata));
 assert.equal(a.t.commit(d=>{d.openingCents+=1;}),true);
 assert.equal(JSON.parse(a.t.getSnapshot())._cloud.revision,22);
});
test('throwing subscribers remain observable after durable save; later listeners and cache stay aligned',()=>{
 const a=account(),received=[];
 const unsubscribe=a.t.session.subscribe(()=>{throw Error('fixture subscriber failed');});
 a.t.session.subscribe(next=>{received.push(next.openingCents);next.openingCents=1;});
 a.t.session.subscribe(next=>assert.equal(next.openingCents,1000005));
 assert.equal(a.t.commit(d=>{d.openingCents+=5;}),true);
 assert.equal(a.t.session.getPublicationErrors()[0],'fixture subscriber failed');
 assert.deepEqual(received,[1000005]);
 assert.equal(a.t.session.getSnapshot().openingCents,1000005);
 assert.equal(a.t.getData().openingCents,1000005);
 assert.equal(JSON.parse(a.storage.get(a.t.key())).openingCents,1000005);
 assert.match(a.node('#alert').innerHTML,/enregistrée.*affichage|affichage.*relancé/);
 assert.doesNotMatch(a.node('#alert').innerHTML,/n’a pas été enregistrée/);
 const errors=a.t.session.getPublicationErrors();errors.length=0;
 assert.equal(a.t.session.getPublicationErrors().length,1);
 unsubscribe();
 a.t.session.adoptRemote(a.t.session.getSnapshot(),a.t.session.getContext());
 assert.equal(a.t.session.getPublicationErrors().length,0);
});

test('remote adoption subscriber failures show a reload notice without rejecting the adopted budget',()=>{
 const a=account(),next=a.t.session.getSnapshot();next.openingCents=300;
 a.t.session.subscribe(()=>{throw Error('remote subscriber failed');});
 const raw=JSON.stringify(next);
 a.t.cloud.hooks.apply(next,raw,a.t.session.getContext());
 assert.equal(a.t.session.getSnapshot().openingCents,300);
 assert.equal(a.t.getSnapshot(),raw);
 assert.match(a.node('#alert').innerHTML,/enregistrée.*affichage|affichage.*relancé/);
});
