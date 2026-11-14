// Isolated stateful transport double; real PostgreSQL transitions are tested separately.
export function unlockDb({id,hash,uid,email='member@example.invalid'}) {
 let now=0, sequence=0;
 const row={id,hash,user_id:uid,email,status:'approved',count:0,expires:900000};
 const valid=(i,h)=>i===id&&h===row.hash&&now<row.expires;
 const db={
  claim:async(i,h)=>{if(!valid(i,h)||row.status==='issued')return {state:'expired'};if(row.status!=='approved')return {state:'pending'};row.status='issued';return {state:'ready',email,user_id:uid};},
  reserve:async(i,h)=>{if(!valid(i,h)||['issued','unknown','completed'].includes(row.status))return {state:'expired'};
   if(row.status==='issuing'&&row.lease>now)return {state:'pending'};
   if(row.status==='issuing'&&row.phase==='dispatched'){row.status='unknown';return {state:'expired'};}
   if(row.count>=5)return {state:'expired'};if(row.retry>now)return {state:'pending'};
   if(!['approved','issuing'].includes(row.status))return {state:'pending'};
   Object.assign(row,{status:'issuing',phase:'reserved',attempt:String(++sequence),lease:now+30000,count:row.count+1});
   return {state:'reserved',attempt_id:row.attempt,email,user_id:uid,lease_until:new Date(Date.now()+30000).toISOString()};},
  dispatch:async(i,h,a)=>{if(!valid(i,h)||row.status!=='issuing'||row.phase!=='reserved'||row.attempt!==a||row.lease<=now)return false;row.phase='dispatched';row.lease=now+30000;return true;},
  finish:async(i,h,a,outcome)=>{if(!valid(i,h)||row.status!=='issuing'||row.phase!=='dispatched'||a!==row.attempt||row.lease<=now)return false;row.status=outcome==='not_issued'?'approved':outcome;row.phase=null;row.retry=now+5000;return true;},
  complete:async(i,h,u)=>{if(!valid(i,h)||u!==uid||row.status!=='issued')return false;row.status='completed';row.hash='0'.repeat(64);return true;}
 };
 return {db,row,advance:ms=>now+=ms};
}
