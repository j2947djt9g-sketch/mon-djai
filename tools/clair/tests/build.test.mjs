import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const run=(...args)=>execFileSync(process.execPath,['tools/clair/build.mjs',...args],{cwd:root,encoding:'utf8'});
test('current artifact byte exact and read-only; generation deterministic',()=>{
 const file='clair/index.html', before=fs.readFileSync(file), stat=fs.statSync(file);
 // Initial extraction size/SHA are recorded in lot4 report; future reviewed sources may evolve.
 run('--check');assert.equal(fs.statSync(file).mtimeMs,stat.mtimeMs);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clair-build-'));
 try {run('--generate','--out',path.join(dir,'a'));run('--generate','--out',path.join(dir,'b'));assert.deepEqual(fs.readFileSync(path.join(dir,'a')),before);assert.deepEqual(fs.readFileSync(path.join(dir,'b')),before);}finally{fs.rmSync(dir,{recursive:true});}
});

test('source mutation, duplicate/missing tokens and stale output fail closed',async()=>{
 const {assemble,build}=await import('../build.mjs');
 const read=p=>fs.readFileSync(path.join(root,p));
 const source='clair/accounts/sounds.js';
 const changed=assemble(p=>p===source?Buffer.concat([read(p),Buffer.from('\n// mutation')]):read(p));
 assert.notDeepEqual(changed.bytes,read('clair/index.html'));
 const template='clair/app/index.template.html', token='@@CLAIR_SOURCE_00@@';
 for(const suffix of ['',token+token])assert.throws(()=>assemble(p=>p===template?Buffer.from(read(p).toString().replace(token,suffix)):read(p)),/once/);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'clair-stale-'));
 try{const target=path.join(tmp,'index');fs.writeFileSync(target,'stale');assert.throws(()=>build(root,true,target),/stale/);assert.equal(fs.readFileSync(target,'utf8'),'stale');}finally{fs.rmSync(tmp,{recursive:true});}
});

test('build manifest cannot silently omit or misplace canonical mirrors/SDK',async()=>{
 const {assemble}=await import('../build.mjs');const read=p=>fs.readFileSync(p),manifest='tools/clair/build-inputs.json';
 const m=JSON.parse(read(manifest));
 const changed=structuredClone(m);changed.inputs[0].container=3;
 assert.throws(()=>assemble(p=>p===manifest?Buffer.from(JSON.stringify(changed)):read(p)),/container|inventory/i);
 const missing=structuredClone(m);missing.inputs=missing.inputs.filter(x=>x.source!=='masterboard/supabase-2.102.0.js');
 assert.throws(()=>assemble(p=>p===manifest?Buffer.from(JSON.stringify(missing)):read(p)),/inventory/i);
});

test('nested exchange compatibility is generated from the engine and stale blobs fail closed', async () => {
 const {assemble}=await import('../build.mjs');
 const read=p=>fs.readFileSync(p);
 assert.throws(()=>assemble(p=>p==='clair/accounts/exchange.js'?Buffer.from('// stale compatibility'):read(p)),/generated|compatibility|nested/i);
 const manifest=JSON.parse(read('tools/clair/mirrors.json'));
 const exchange=manifest.mirrors.find(x=>x.source==='clair/accounts/exchange.js');
 assert.equal(exchange.generatedFrom,'clair/domain/engine.js');
 assert.equal(exchange.nestedIn,'clair/domain/engine.js');
});

test('explicit generation repairs compatibility; output preview cannot mutate a stale checkout', async () => {
 const {build}=await import('../build.mjs');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clair-derived-'));
 try {
  const manifest=JSON.parse(fs.readFileSync('tools/clair/build-inputs.json'));
  const paths=new Set([manifest.template,'tools/clair/build-inputs.json','tools/clair/mirrors.json',...manifest.inputs.map(x=>x.source),'clair/accounts/exchange.js','clair/index.html']);
  for(const p of paths){fs.mkdirSync(path.dirname(path.join(temp,p)),{recursive:true});fs.copyFileSync(p,path.join(temp,p));}
  const child=path.join(temp,'clair/accounts/exchange.js');fs.writeFileSync(child,'// stale');
  assert.throws(()=>build(temp,true),/compatibility stale/);
  assert.throws(()=>build(temp,false,path.join(temp,'preview.html')),/compatibility stale/);
  assert.equal(fs.readFileSync(child,'utf8'),'// stale');
  build(temp,false);build(temp,true);
  assert.deepEqual(fs.readFileSync(child),fs.readFileSync('clair/accounts/exchange.js'));
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
