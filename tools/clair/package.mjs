import fs from 'node:fs';
import path from 'node:path';
import {options,expectedPackage,safeOutput} from './package-lib.mjs';
try{
 const opts=options(process.argv.slice(2),['--ref','--out']);
 const target=safeOutput(opts['--out']),expected=expectedPackage(opts['--ref']);
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('Output must be absent or empty; no cleanup performed');
 fs.mkdirSync(target,{recursive:true});
 for(const [p,bytes] of expected.files){fs.mkdirSync(path.dirname(path.join(target,p)),{recursive:true});fs.writeFileSync(path.join(target,p),bytes,{flag:'wx'});}
 console.log('PASS package: '+expected.commit+'; '+expected.files.size+' files ('+expected.manifest.files.length+' hashed entries + manifest)');
}catch(e){console.error(e.message);process.exitCode=1;}
