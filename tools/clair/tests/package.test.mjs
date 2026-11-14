import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {committed,expectedPackage,verifyPackage,safeOutput,hash} from '../package-lib.mjs';
const root=process.cwd();
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function writePackage(p,out){fs.mkdirSync(out);for(const [name,bytes] of p.files){const file=path.join(out,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}}
test('commit-only recipe deterministic; dirty/untracked cannot contaminate; tamper/extra/missing/symlink rejected',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'clair-package-test-')),repo=path.join(temp,'repo');fs.mkdirSync(repo);
 try{
  const original=committed('HEAD'),recipe=JSON.parse(original.read('tools/clair/package-inputs.json')),build=JSON.parse(original.read('tools/clair/build-inputs.json'));
  const inputs=new Set([...recipe.public,...recipe.licenses,recipe.config,build.template,...build.inputs.map(x=>x.source),'tools/clair/package-inputs.json','tools/clair/build-inputs.json','tools/clair/mirrors.json']);
  for(const p of inputs){const dest=path.join(repo,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,original.read(p));}
  git(repo,'init','-q');git(repo,'config','user.email','fixtures@example.invalid');git(repo,'config','user.name','Fixture');git(repo,'add','.');git(repo,'commit','-qm','fixture');
  const ref=git(repo,'rev-parse','HEAD'), first=expectedPackage(ref,repo), second=expectedPackage(ref,repo);
  assert.equal(first.files.size,recipe.public.length+recipe.licenses.length+2);assert.deepEqual(first,second);
  for(const p of recipe.public)assert.deepEqual(first.files.get(p),original.read(p));
  fs.writeFileSync(path.join(repo,'clair/index.html'),'dirty');fs.writeFileSync(path.join(repo,'clair/secret.env'),'untracked fixture');fs.writeFileSync(path.join(repo,'tools/clair/package-inputs.json'),'dirty recipe');
  assert.deepEqual(expectedPackage(ref,repo),first);
  const out=path.join(temp,'out');writePackage(first,out);verifyPackage(ref,out,repo);
  const file=path.join(out,'clair/index.html');fs.appendFileSync(file,'tamper');const manifestPath=path.join(out,'clair-package-manifest.json');const forged=JSON.parse(fs.readFileSync(manifestPath));const entry=forged.files.find(x=>x.path==='clair/index.html');entry.sha256=hash(fs.readFileSync(file));entry.bytes=fs.statSync(file).size;fs.writeFileSync(manifestPath,JSON.stringify(forged,null,2)+'\n');assert.throws(()=>verifyPackage(ref,out,repo),/bytes differ/);fs.writeFileSync(file,first.files.get('clair/index.html'));fs.writeFileSync(manifestPath,first.files.get('clair-package-manifest.json'));
  fs.writeFileSync(path.join(out,'unexpected.env'),'fixture');assert.throws(()=>verifyPackage(ref,out,repo),/inventory/);fs.unlinkSync(path.join(out,'unexpected.env'));
  fs.mkdirSync(path.join(out,'empty'));assert.throws(()=>verifyPackage(ref,out,repo),/empty directory/);fs.rmdirSync(path.join(out,'empty'));
  fs.unlinkSync(file);assert.throws(()=>verifyPackage(ref,out,repo),/inventory/);fs.symlinkSync(path.join(repo,'clair/index.html'),file);assert.throws(()=>verifyPackage(ref,out,repo),/Symlink/);fs.unlinkSync(file);
  const linked=path.join(temp,'linked');fs.symlinkSync(out,linked);assert.throws(()=>safeOutput(linked+'/nested',repo),/Symlink/);assert.throws(()=>safeOutput(path.join(repo,'package'),repo),/outside/);
  git(repo,'reset','--hard',ref);
  const recipeFile=path.join(repo,'tools/clair/package-inputs.json');
  for(const bad of ['../escape','/absolute','clair/../escape','clair/fixtures/secret.json','clair/test.sql','clair/accounts/test-fixture.js']){
   fs.writeFileSync(recipeFile,JSON.stringify({...recipe,public:[...recipe.public,bad]}));git(repo,'add','.');git(repo,'commit','-qm','bad recipe fixture');assert.throws(()=>expectedPackage('HEAD',repo),/Unsafe|Forbidden/);git(repo,'reset','--hard',ref);
  }
  fs.unlinkSync(path.join(repo,'clair/index.html'));fs.symlinkSync('../robots.txt',path.join(repo,'clair/index.html'));git(repo,'add','.');git(repo,'commit','-qm','symlink fixture');assert.throws(()=>expectedPackage('HEAD',repo),/regular file/);git(repo,'reset','--hard',ref);
  fs.writeFileSync(path.join(repo,recipe.config),JSON.stringify({redirects:[{source:'/',destination:'/masterboard/',permanent:false}]}));git(repo,'add','.');git(repo,'commit','-qm','wrong redirect fixture');assert.throws(()=>expectedPackage('HEAD',repo),/redirect/);git(repo,'reset','--hard',ref);
  const derived=JSON.parse(original.read('tools/clair/mirrors.json')).mirrors.find(entry=>entry.generatedFrom);
  if(derived){
   fs.writeFileSync(path.join(repo,derived.source),'// stale generated compatibility');git(repo,'add','.');git(repo,'commit','-qm','stale compatibility fixture');
   assert.throws(()=>expectedPackage('HEAD',repo),/compatibility stale/);git(repo,'reset','--hard',ref);
  }
  for(const name of ['clair/index.html',build.template])fs.writeFileSync(path.join(repo,name),fs.readFileSync(path.join(repo,name),'utf8').replace('<head>','<head><meta name="robots" content="noindex,nofollow">'));git(repo,'add','.');git(repo,'commit','-qm','demo noindex fixture');assert.throws(()=>expectedPackage('HEAD',repo),/noindex/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
