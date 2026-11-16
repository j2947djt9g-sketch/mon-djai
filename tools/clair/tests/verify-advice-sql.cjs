#!/usr/bin/env node
'use strict';
// No connection string is accepted: every run owns a disposable, networkless database.
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const container = `clair-advice-sql-${process.pid}-${Date.now()}`;
const env = { ...process.env };
for (const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']) delete env[k];
function docker(args, input, allowFailure = false) {
  const r = spawnSync('docker', ['--host=unix:///var/run/docker.sock', ...args], { env, input, encoding:'utf8', maxBuffer:8*1024*1024 });
  if (!allowFailure && (r.error || r.status !== 0)) throw Error(r.error?.message || r.stderr || r.stdout);
  return r;
}
function sqlFile(name) {
  let source=readFileSync(path.join(root, 'clair/accounts', name), 'utf8');
  if (process.argv.includes('--without-guard')) source=source.replace(/-- BEGIN ADVICE GUARD[\s\S]*?-- END ADVICE GUARD/g,'');
  return source.replace(/^\\ir ([^\r\n]+)$/gm, (_, file) => sqlFile(file));
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{
  docker(['rm','--force',container],undefined,true);
  process.exit(signal==='SIGINT'?130:143);
});
try {
  docker(['run','--detach','--rm','--name',container,'--network=none','--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17.6']);
  let ready = false;
  for (let i=0; i<80; i++) {
    if (docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],undefined,true).status===0) { ready=true; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);
  }
  if (!ready) throw Error('Disposable PostgreSQL did not start');
  const bootstrap = `create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;`;
  let source = sqlFile('verify-advice.sql');
  if (process.argv.includes('--without-guard')) source=source.replace(/-- BEGIN ADVICE GUARD[\s\S]*?-- END ADVICE GUARD/g,'');
  const r = docker(['exec','-i',container,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','--quiet'],bootstrap+'\n'+source);
  process.stdout.write(r.stdout);
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { docker(['rm','--force',container],undefined,true); }
