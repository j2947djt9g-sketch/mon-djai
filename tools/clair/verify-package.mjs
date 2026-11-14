import {options,verifyPackage} from './package-lib.mjs';
try{const opts=options(process.argv.slice(2),['--ref','--out']);const p=verifyPackage(opts['--ref'],opts['--out']);console.log('PASS package verification: '+p.commit+'; '+p.files.size+' exact files');}
catch(e){console.error(e.message);process.exitCode=1;}
