import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {expectedPackage,options} from './package-lib.mjs';
export async function verifyLive(domain,ref,manifestPath){
 const url=new URL(domain);
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!(url.protocol==='https:'&&url.hostname.endsWith('.vercel.app')||local&&url.protocol==='http:'))throw Error('Explicit Vercel HTTPS origin required (HTTP loopback for local tests only)');
 const expected=expectedPackage(ref),manifest=fs.readFileSync(manifestPath);
 if(!manifest.equals(expected.files.get('clair-package-manifest.json')))throw Error('Explicit manifest does not match chosen commit');
 const get=(p)=>fetch(new URL(p,url),{redirect:'manual',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
 const redirect=await get('/');
 if(redirect.status!==307||new URL(redirect.headers.get('location')||'/',url).href!==new URL('/clair/',url).href)throw Error('Root redirect differs');
 for(const [p,bytes] of expected.files){
  if(p==='vercel.json')continue; // Configuration consumed by Vercel, not a public endpoint.
  const response=await get('/'+p+'?clair-commit='+expected.commit);
  if(response.status!==200||!Buffer.from(await response.arrayBuffer()).equals(bytes))throw Error('Published bytes differ: '+p);
 }
 return expected.commit;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const opts=options(process.argv.slice(2),['--domain','--ref','--manifest']);console.log('PASS explicit publication: '+await verifyLive(opts['--domain'],opts['--ref'],opts['--manifest']));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
