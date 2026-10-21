export function parisTime(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=k=>parts.find(p=>p.type===k).value;
  return {date:get('year')+'-'+get('month')+'-'+get('day'),hour:Number(get('hour'))};
}
export function remindersFor(payload,date){
  if(!payload?.initialized||!payload.setupDone||payload.preferences?.reminders===false)return [];
  const due=new Date(Date.parse(date+'T12:00:00Z')+2*86400000).toISOString().slice(0,10);
  const day=Number(due.slice(8)),month=Number(due.slice(5,7));
  const last=new Date(Date.UTC(Number(due.slice(0,4)),month,0)).getUTCDate();
  const recorded=new Set((payload.transactions||[]).map(t=>t.autoKey));
  const paid=new Set((payload.transactions||[]).filter(t=>t.fixedExpenseId).map(t=>t.fixedExpenseId+':'+(t.fixedMonth||t.date.slice(0,7))));
  const skipped=new Set(payload.skipped||[]);
  return (payload.rules||[]).filter(r=>{
    if(!['monthly','yearly'].includes(r.kind)||r.reminderEnabled===false||!(r.amountCents>0))return false;
    if(due<r.start||(r.end&&due>r.end)||due<payload.openingBalanceDate)return false;
    if((r.pauses||[]).some(p=>due>=p.start&&due<=p.end))return false;
    if((r.day==='last'?last:Math.min(r.day,last))!==day||(r.kind==='yearly'&&r.month!==month))return false;
    return !recorded.has(r.id+':'+due)&&!skipped.has(r.id+':'+due)&&!(r.originFixedId&&paid.has(r.originFixedId+':'+due.slice(0,7)));
  }).map(r=>({key:r.id+':'+due,name:String(r.name).slice(0,80),amountCents:r.amountCents,due}));
}
export function validateSubscription(s){
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2048)throw Error('Abonnement de notification invalide.');
  const u=new URL(s.endpoint),host=u.hostname;
  if(u.protocol!=='https:'||u.username||u.password||u.hash||(u.port&&u.port!=='443')||!(host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host==='web.push.apple.com'||host.endsWith('.push.apple.com')||host.endsWith('.notify.windows.com')))throw Error('Service de notification non autorisé.');
  if(typeof s.keys?.p256dh!=='string'||!/^[A-Za-z0-9_-]{87}=?$/.test(s.keys.p256dh)||typeof s.keys?.auth!=='string'||!/^[A-Za-z0-9_-]{22}(==)?$/.test(s.keys.auth))throw Error('Clés de notification invalides.');
  return {endpoint:u.href,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
