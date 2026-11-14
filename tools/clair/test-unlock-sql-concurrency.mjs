// Two actual psql processes/connections. Fixtures only; never point this at a hosted database.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
if(!process.env.CLAIR_TEST_PSQL_BINARY&&!['localhost','127.0.0.1',undefined].includes(process.env.PGHOST))throw Error('Only isolated localhost is allowed');
const binary=process.env.CLAIR_TEST_PSQL_BINARY||'psql';
function connection(sql, marker){
 const child=spawn(binary,['-X','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});let out='',err='',seen=false;
 const done=new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{out+=chunk;if(marker&&!seen&&out.includes('LOCKED')){seen=true;marker();}});child.stderr.on('data',chunk=>err+=chunk);child.on('error',reject);child.on('exit',code=>code===0?resolve(out.trim()):reject(Error(err)));});child.stdin.end(sql);return done;
}
const id='b3000000-0000-4000-8000-000000000010',uid='b3000000-0000-4000-8000-000000000011',h="repeat('a',64)";
const reserve=`public.clair_reserve_device_unlock_v2('${id}',${h})`;
const claim=`public.clair_claim_device_unlock('${id}',${h})`;
const dispatch=`public.clair_dispatch_device_unlock_v2('${id}',${h},(select attempt_id from public.clair_device_unlocks where id='${id}'))`;
const setup=`insert into auth.users(id) values('${uid}');insert into public.clair_account_help(id,email,reason,fingerprint) values('${id}','race@example.invalid','access_problem',repeat('f',64));insert into public.clair_device_unlocks(id,email,secret_hash,device_label,fingerprint,status,user_id) values('${id}','race@example.invalid',${h},'Race fixture',repeat('f',64),'approved','${uid}');`;
const reset=`update public.clair_device_unlocks set status='approved',issue_phase=null,attempt_id=null,lease_until=null,issue_count=0,retry_after=null,expires_at=clock_timestamp()+interval '15 minutes' where id='${id}';`;
async function race(first,second){let release;const locked=new Promise(r=>release=r);
 const one=connection(`begin;select pg_backend_pid();${first}\n\\echo LOCKED\nselect pg_sleep(0.6);commit;`,release);await locked;
 const two=connection(`select pg_backend_pid();${second}`);const outputs=await Promise.all([one,two]);assert.notEqual(outputs[0].split('\n')[0],outputs[1].split('\n')[0]);return outputs;
}
try{
 await connection(setup);
 let result=await race(`select ${reserve}->>'state';`,`select ${reserve}->>'state';`);assert(result[0].includes('reserved'));assert(result[1].endsWith('pending'));
 result=await race(`select ${dispatch};`,`select ${dispatch};`);assert(result[0].includes('\nt\n'));assert(result[1].endsWith('f'));assert.equal(await connection(`select issue_count from public.clair_device_unlocks where id='${id}';`),'1');
 await connection(reset);result=await race(`select ${claim}->>'state';`,`select ${reserve}->>'state';`);assert(result[0].includes('ready'));assert(result[1].endsWith('expired'));
 await connection(reset);result=await race(`select ${reserve}->>'state';`,`select ${claim}->>'state';`);assert(result[0].includes('reserved'));assert(result[1].endsWith('pending'));
 await connection(reset);result=await race(`update public.clair_device_unlocks set expires_at=clock_timestamp()+interval '0.3 seconds' where id='${id}';`,`select ${reserve}->>'state';`);assert(result[1].endsWith('expired'),'reserve checks time after waiting for lock');
 await connection(reset);await connection(`select ${reserve};`);result=await race(`update public.clair_device_unlocks set lease_until=clock_timestamp()+interval '0.3 seconds' where id='${id}';`,`select ${dispatch};`);assert(result[1].endsWith('f'),'dispatch checks lease after waiting for lock');
 await connection(reset);await connection(`select ${reserve};select ${dispatch};`);result=await race(`update public.clair_device_unlocks set lease_until=clock_timestamp()+interval '0.3 seconds' where id='${id}';`,`select public.clair_finish_device_unlock_v2('${id}',${h},(select attempt_id from public.clair_device_unlocks where id='${id}'),'issued');`);assert(result[1].endsWith('f'),'finish checks lease after waiting for lock');
 console.log('PASS two distinct PostgreSQL backends: reserve/dispatch races, old/v2 both orders, expiry after lock wait at reserve/dispatch/finish');
}finally{await connection(`delete from public.clair_account_help where id='${id}';delete from auth.users where id='${uid}';`);}
