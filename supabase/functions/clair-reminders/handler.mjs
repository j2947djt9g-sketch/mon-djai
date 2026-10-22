import {parisTime,remindersFor,validateSubscription} from './schedule.mjs';
const ORIGIN='https://j2947djt9g-sketch.github.io';
export function createHandler({db,authenticate,send,generateKeys,now=()=>new Date(),randomId=()=>crypto.randomUUID()}){
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':ORIGIN,'vary':'Origin'}});
  async function config(){
    let c=await db.config();
    if(!c.public_key){await db.initKeys(generateKeys());c=await db.config();}
    return c;
  }
  return async req=>{
    const route=new URL(req.url).pathname.split('/').pop(),origin=req.headers.get('origin');
    if(origin&&origin!==ORIGIN)return reply({error:'Origine refusée.'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type','access-control-max-age':'600'}});
    if(req.method!=='POST')return reply({error:'Méthode refusée.'},405);
    try{
      if(route==='dispatch'){
        const c=await db.config(),secret=req.headers.get('x-clair-cron-secret')||'';
        if(!secret||secret!==c.cron_secret)return reply({error:'Accès refusé.'},401);
        const time=parisTime(now());if(time.hour!==9)return reply({sent:0,outsideWindow:true});
        let sent=0,failed=0;const budgets=new Map();
        for(const device of await db.devices()){
          if(!budgets.has(device.user_id))budgets.set(device.user_id,await db.budget(device.user_id));
          for(const reminder of remindersFor(budgets.get(device.user_id),time.date)){
            const claim=randomId();if(!await db.claim(device.device_id,reminder.key,claim))continue;
            try{
              // Read again just before sending: respect changes made on another device.
              const latest=await db.budget(device.user_id),fresh=remindersFor(latest,time.date).find(r=>r.key===reminder.key);
              const current=await db.device(device.device_id);
              if(!fresh||!current?.enabled||current.user_id!==device.user_id){await db.release(device.device_id,reminder.key,claim);continue;}
              const amount=new Intl.NumberFormat('fr-FR',{style:'currency',currency:latest.currency||'EUR'}).format(fresh.amountCents/100);
              await send(validateSubscription(current.subscription),{title:'Clair — dans 2 jours',body:fresh.name+' : '+amount+' à prévoir le '+fresh.due.slice(8)+'/'+fresh.due.slice(5,7)+'.',tag:'clair-'+fresh.key},c);
              await db.complete(device.device_id,reminder.key,claim);sent++;
            }catch(error){
              if(error.statusCode===404||error.statusCode===410)await db.disable(device.device_id);
              await db.release(device.device_id,reminder.key,claim);failed++;
            }
          }
        }
        return reply({sent,failed});
      }
      if(!['vapid','subscribe','unsubscribe','status'].includes(route))return reply({error:'Route inconnue.'},404);
      const user=await authenticate(req.headers.get('authorization')||'');
      if(!user)return reply({error:'Connecte-toi pour activer les rappels.'},401);
      if(route==='vapid')return reply({publicKey:(await config()).public_key});
      // Limit streaming input even when Content-Length was omitted.
      const reader=req.body?.getReader();let raw='',length=0;const decoder=new TextDecoder();
      if(reader)for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16000){await reader.cancel();return reply({error:'Requête trop volumineuse.'},413);}raw+=decoder.decode(value,{stream:true});}
      raw+=decoder.decode();const body=JSON.parse(raw||'{}');
      if(typeof body.deviceId!=='string'||!/^[a-f0-9]{32}$/.test(body.deviceId))return reply({error:'Appareil invalide.'},400);
      const device=await db.device(body.deviceId);
      if(device&&device.user_id!==user.id)return reply({error:'Appareil indisponible.'},409);
      if(route==='subscribe'){
        const subscription=validateSubscription(body.subscription);
        if(!device&&await db.deviceCount(user.id)>=10)return reply({error:'Désactive un ancien appareil avant d’en ajouter un autre (10 maximum).'},409);
        await db.subscribe({device_id:body.deviceId,user_id:user.id,subscription,enabled:true,updated_at:now().toISOString()});
        return reply({active:true});
      }
      if(!device)return reply({active:false});
      if(route==='unsubscribe'){await db.disable(body.deviceId);return reply({active:false});}
      return reply({active:device.enabled});
    }catch(error){
      const invalid=error instanceof SyntaxError||/notification|autorisé|Invalid URL/.test(error.message);
      return reply({error:invalid?error.message:'Le service de rappels est indisponible. Réessaie.'},invalid?400:503);
    }
  };
}

