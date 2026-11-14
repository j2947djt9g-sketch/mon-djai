import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {expectedPackage} from '../package-lib.mjs';
test('explicit local domain, commit and manifest; redirects and every published byte verified',async()=>{
 const {verifyLive}=await import('../verify-live.mjs');
 const expected=expectedPackage('HEAD'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'clair-live-')),manifest=path.join(temp,'manifest.json');fs.writeFileSync(manifest,expected.files.get('clair-package-manifest.json'));
 let tamper=false,wrongRedirect=false;
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.writeHead(307,{Location:wrongRedirect?'/masterboard/':'/clair/'});res.end();return;}const bytes=expected.files.get(p.slice(1));if(!bytes){res.writeHead(404);res.end();return;}res.end(tamper&&p==='/clair/index.html'?'tampered':bytes);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const domain='http://127.0.0.1:'+server.address().port;
 try{await verifyLive(domain,expected.commit,manifest);tamper=true;await assert.rejects(verifyLive(domain,expected.commit,manifest),/bytes/);tamper=false;wrongRedirect=true;await assert.rejects(verifyLive(domain,expected.commit,manifest),/redirect/);await assert.rejects(verifyLive('https://example.invalid',expected.commit,manifest),/Vercel/);fs.writeFileSync(manifest,'{}');await assert.rejects(verifyLive(domain,expected.commit,manifest),/manifest/);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true});}
});
