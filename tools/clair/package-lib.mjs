import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assemble,safePath,root} from './build.mjs';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function options(args,allowed){
 const opts={};
 for(let i=0;i<args.length;i+=2){if(!allowed.includes(args[i])||!args[i+1]||opts[args[i]])throw Error('Required explicit arguments: '+allowed.join(' '));opts[args[i]]=args[i+1];}
 if(allowed.some(k=>!opts[k]))throw Error('Required explicit arguments: '+allowed.join(' '));return opts;
}
export function committed(ref,repo=root){
 if(!ref||ref.startsWith('-')||!/^[-\w./]+$/.test(ref))throw Error('Invalid ref');
 const git=(args)=>execFileSync('git',['-C',repo,...args],{maxBuffer:20*1024*1024});
 const commit=git(['rev-parse','--verify',ref+'^{commit}']).toString().trim();
 const entries=new Map(git(['ls-tree','-rz','--full-tree',commit]).toString().split('\0').filter(Boolean).map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')];}));
 const read=p=>{safePath(p);const entry=entries.get(p);if(!entry||entry[0]!=='100644'||entry[1]!=='blob')throw Error('Input must be a tracked regular file: '+p);return git(['show',commit+':'+p]);};
 return{commit,read};
}
function runtimePath(p){
 safePath(p);
 if(p==='robots.txt'||p==='sitemap.xml')return;
 if(!/^(clair|masterboard)\//.test(p)||/(^|\/)(?:docs|tests?|app|design-preview|demo|fixtures?)(\/|$)/i.test(p)||/(^|\/)(?:test|verify|fixture|demo|secret|credentials?)[-_.]/i.test(p)||/\.(?:cjs|mjs|sql|md|txt)$/i.test(p)||! /\.(?:html|js|css|webmanifest|svg|png|webp|json|woff2)$/.test(p))throw Error('Forbidden public source: '+p);
}
export function expectedPackage(ref,repo=root){
 const {commit,read}=committed(ref,repo),recipe=JSON.parse(read('tools/clair/package-inputs.json'));
 if(recipe.version!==1)throw Error('Unknown package recipe');
 const files=new Map(),rows=[];
 const add=(source,target=source)=>{safePath(target);if(files.has(target))throw Error('Duplicate package target');const bytes=read(source);files.set(target,bytes);rows.push({path:target,source,bytes:bytes.length,sha256:hash(bytes)});};
 for(const p of recipe.public){runtimePath(p);add(p);}
 const legal=['clair/accounts/LICENSE-supabase.txt','masterboard/assets/fonts/OFL-Manrope.txt'];
 if(JSON.stringify(recipe.licenses)!==JSON.stringify(legal))throw Error('Explicit legal license inventory differs');
 for(const p of legal)add(p);
 if(recipe.config!=='tools/clair/vercel.json')throw Error('Unexpected configuration source');
 add(recipe.config,'vercel.json');
 const cfg=JSON.parse(files.get('vercel.json'));
 if(JSON.stringify(cfg)!==JSON.stringify({redirects:[{source:'/',destination:'/clair/',permanent:false}]}))throw Error('Root redirect contract differs');
 if(files.has('index.html')||!files.has('robots.txt')||!files.has('sitemap.xml'))throw Error('Root public contract differs');
 const built=assemble(read);
 if(!files.get(built.output)?.equals(built.bytes))throw Error('Committed generated HTML stale');
 const head=built.bytes.toString('utf8').match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 for(const tag of head.match(/<meta\b[^>]*>/gi)||[])if(/\bname\s*=\s*(?:[\"']robots[\"']|robots(?=\s|>))/i.test(tag)&&/noindex/i.test(tag))throw Error('Clair demo noindex is forbidden');
 const mirrors=JSON.parse(read('tools/clair/mirrors.json'));
 for(const p of [...mirrors.mirrors,...mirrors.external].map(m=>m.source))if(!files.has(p))throw Error('Missing account runtime: '+p);
 for(const p of ['masterboard/index.html','masterboard/masterboard.js','masterboard/masterboard.css','masterboard/sw.js','masterboard/offline.html','masterboard/install.js','masterboard/admin-ui.css','masterboard/intro-ui.css','masterboard/motion-ui.css','masterboard/type-ui.css','masterboard/manifest.webmanifest','masterboard/supabase-2.102.0.js','masterboard/assets/fonts/manrope-latin-ext-wght.woff2','masterboard/assets/fonts/manrope-latin-wght.woff2'])if(!files.has(p))throw Error('Missing Masterboard runtime: '+p);
 rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const manifest={version:1,commit,files:rows};
 files.set('clair-package-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 return{commit,files,manifest};
}
export function safeOutput(out,repo=root){
 const target=path.resolve(out), checkout=fs.realpathSync(repo);
 let cursor=target;
 while(true){
  try{if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Symlink output path');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(cursor===path.dirname(cursor))break;cursor=path.dirname(cursor);
 }
 if(target===checkout||target.startsWith(checkout+path.sep))throw Error('Output must be outside checkout');
 return target;
}
export function listFiles(dir,prefix=''){
 const files=[];
 for(const name of fs.readdirSync(dir).sort()){
  const rel=prefix?prefix+'/'+name:name;safePath(rel);const stat=fs.lstatSync(path.join(dir,name));
  if(stat.isSymbolicLink())throw Error('Symlink in package: '+rel);
  if(stat.isDirectory()){const nested=listFiles(path.join(dir,name),rel);if(!nested.length)throw Error('Extra empty directory: '+rel);files.push(...nested);}
  else if(stat.isFile())files.push(rel);else throw Error('Nonregular output: '+rel);
 }return files;
}
export function verifyPackage(ref,out,repo=root){
 const target=safeOutput(out,repo),expected=expectedPackage(ref,repo),actual=listFiles(target).sort();
 if(JSON.stringify(actual)!==JSON.stringify([...expected.files.keys()].sort()))throw Error('Package file inventory differs');
 for(const [p,bytes] of expected.files)if(!fs.readFileSync(path.join(target,p)).equals(bytes))throw Error('Package bytes differ: '+p);
 return expected;
}
