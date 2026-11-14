import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generatedSources,checkGenerated} from './generated-sources.mjs';
import {containers} from './check-mirrors.mjs';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export function safePath(value){
 if(typeof value!=='string'||!value||value.includes('\\')||/[\x00-\x1f\x7f:]/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..')||path.posix.isAbsolute(value))throw Error('Unsafe path: '+value);
 return value;
}
export function assemble(read){
 const rawRead=read;read=p=>rawRead(safePath(p));
 const m=JSON.parse(read('tools/clair/build-inputs.json').toString('utf8'));
 if(![1,2].includes(m.version))throw Error('Unknown build version');
 const mirrors=JSON.parse(read('tools/clair/mirrors.json'));
 checkGenerated(mirrors,read);
 const canonical=[...mirrors.mirrors,{source:'masterboard/supabase-2.102.0.js',container:2,tag:'script',order:0}];
 if(JSON.stringify(m.inputs.map(x=>x.source).sort())!==JSON.stringify(canonical.filter(x=>!x.nestedIn).map(x=>x.source).sort()))throw Error('Canonical input inventory differs');
 if(JSON.stringify(m.containers)!==JSON.stringify(mirrors.containers))throw Error('Canonical container inventory differs');
 let html=read(safePath(m.template)).toString('utf8');
 const tokens=new Set(), sources=new Set();
 for(const input of m.inputs){
  if(!/^@@CLAIR_[A-Z0-9_]+@@$/.test(input.token)||tokens.has(input.token)||sources.has(input.source))throw Error('Duplicate/invalid input');
  tokens.add(input.token);sources.add(input.source);
  if(canonical.find(c=>c.source===input.source).container!==input.container)throw Error('Canonical container differs');
  if(html.split(input.token).length!==2)throw Error('Placeholder must appear once: '+input.token);
  if(input.transform!=='trim')throw Error('Unknown transform');
  html=html.replace(input.token,()=>read(safePath(input.source)).toString('utf8').trim());
 }
 if(/@@CLAIR_[A-Z0-9_]+@@/.test(html))throw Error('Unresolved placeholder');
 const blocks=containers(html),tags=blocks.map(b=>b.tag);
 const positions=new Map();
 for(const input of canonical){
  const text=read(safePath(input.source)).toString('utf8').trim(),matches=[];
  if(!text)throw Error('Empty canonical source: '+input.source);
  blocks.forEach((block,index)=>{let offset=-1;while((offset=block.body.indexOf(text,offset+1))!==-1)matches.push({block,index,offset});});
  if(!text||matches.length!==1||matches[0].index!==input.container||!matches[0].block.executable||matches[0].block.tag!==input.tag)throw Error('Canonical source container/parity differs: '+input.source);
  if(!positions.has(input.container))positions.set(input.container,[]);positions.get(input.container).push({...input,offset:matches[0].offset});
 }
 for(const entries of positions.values())entries.filter(x=>!x.nestedIn).sort((a,b)=>a.offset-b.offset).forEach((entry,i)=>{if(entry.order!==i)throw Error('Canonical source order differs');});
 if(JSON.stringify(tags)!==JSON.stringify(m.containers))throw Error('Container order differs');
 return {output:safePath(m.output),bytes:Buffer.from(html)};
}
export function build(base=root,check=true,out){
 const read=p=>fs.readFileSync(path.join(base,safePath(p)));
 if(!check&&!out){
  const manifest=JSON.parse(read('tools/clair/mirrors.json'));
  for(const [source,bytes] of generatedSources(manifest,read))fs.writeFileSync(path.join(base,safePath(source)),bytes);
 }
 const result=assemble(read);
 const target=out||path.join(base,result.output);
 if(check){if(!fs.readFileSync(target).equals(result.bytes))throw Error('Generated index stale; use explicit --generate after reviewing sources');}
 else fs.writeFileSync(target,result.bytes);
 return result.bytes;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);let check=args.shift()==='--check';
  if(!check&&process.argv[2]!=='--generate')throw Error('Usage: build.mjs --check | --generate [--out file]');
  let out;if(args.length){if(check||args.length!==2||args[0]!=='--out')throw Error('Invalid arguments');out=path.resolve(args[1]);}
  console.log('PASS build: '+build(root,check,out).length+' bytes'+(check?' (read-only)':''));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
