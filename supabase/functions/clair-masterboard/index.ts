import {createHandler} from './core.mjs';
const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function request(path:string,method='GET',body?:unknown,extra:Record<string,string>={}){
  const res=await fetch(base+path,{method,headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json',prefer:'return=representation',...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('Backend refused operation');return res.status===204?null:res.json();
}
const rest=(path:string,method='GET',body?:unknown)=>request('/rest/v1/'+path,method,body);
const prefix='clair_masterboard_';
const rows=(name:string,query='')=>rest(prefix+name+'?'+query);
const one=async(name:string,query:string)=>(await rows(name,query))[0]||null;
async function all(path:string){const result=[];for(let offset=0;;offset+=500){const page=await rest(path+'&limit=500&offset='+offset);result.push(...page);if(page.length<500)return result;}}
const db={
  isAdmin:async(id:string)=>!!await one('admins','select=user_id&user_id=eq.'+id),
  admins:async()=>(await rows('admins','select=user_id')).map((x:{user_id:string})=>x.user_id),
  settings:()=>one('settings','id=eq.true&select=mode,monthly_cents,payment_phone'),
  saveSettings:(phone:string)=>rest(prefix+'settings?id=eq.true','PATCH',{payment_phone:phone}),
  subscriptions:()=>all(prefix+'subscriptions?select=user_id,test_until&order=user_id'),
  subscription:(id:string)=>one('subscriptions','user_id=eq.'+id),
  setTestDate:(id:string,date:string)=>request('/rest/v1/'+prefix+'subscriptions?on_conflict=user_id','POST',{user_id:id,test_until:date,updated_at:new Date().toISOString()},{prefer:'resolution=merge-duplicates,return=representation'}),
  profiles:()=>all('clair_budgets?select=user_id,display_name&order=user_id'),
  helpRequests:()=>rest('clair_account_help?select=id,email,reason,status,created_at&order=created_at.desc&limit=100'),
  closeHelp:(id:string)=>rest('clair_account_help?id=eq.'+id,'PATCH',{status:'closed',updated_at:new Date().toISOString()}),
  authorizeHelp:(email:string)=>rest('clair_account_help?email=eq.'+encodeURIComponent(email)+'&status=eq.pending','PATCH',{status:'authorized',updated_at:new Date().toISOString()}),
  recentResetCount:async(id:string,since:string)=>(await rows('audit','select=id&target_id=eq.'+id+'&action=eq.reset_authorized&created_at=gte.'+encodeURIComponent(since))).length,
  messages:()=>rows('mail','select=id,user_id,email,subject,kind,state,created_at,opened_at,confirmed_at&order=created_at.desc&limit=100'),
  message:(id:string)=>one('mail','id=eq.'+id),
  recentMailCount:async(id:string,now:Date)=>(await rows('mail','select=id&user_id=eq.'+id+'&created_at=gte.'+encodeURIComponent(new Date(+now-86400000).toISOString()))).length,
  insertMessage:(value:unknown)=>rest(prefix+'mail','POST',value),
  updateMessage:(id:string,state:string,date:string)=>rest(prefix+'mail?id=eq.'+id,'PATCH',{state,...(state==='confirmed_sent'?{confirmed_at:date}:{opened_at:date})}),
  audit:()=>rows('audit','select=action,created_at&order=created_at.desc&limit=50'),
  log:(actor:string,target:string|null,action:string)=>rest(prefix+'audit','POST',{actor_id:actor,target_id:target,action}),
  renew:(actor:string,target:string,today:string)=>rest('rpc/clair_masterboard_renew','POST',{p_actor:actor,p_target:target,p_today:today}),
  disableDevices:(id:string)=>rest('clair_push_devices?user_id=eq.'+id,'PATCH',{enabled:false})
};
const auth={
  user:async(header:string)=>{
    if(!/^Bearer [A-Za-z0-9_.-]+$/.test(header))return null;
    const res=await fetch(base+'/auth/v1/user',{headers:{apikey:key,authorization:header},signal:AbortSignal.timeout(10000)});
    return res.ok?res.json():null;
  },
  users:async()=>{const users=[];for(let page=1;page<=1000;page++){const data=await request('/auth/v1/admin/users?page='+page+'&per_page=200');users.push(...data.users);if(data.users.length<200)return users;}throw Error('Too many pages');},
  target:async(id:string)=>{try{return await request('/auth/v1/admin/users/'+id);}catch{return null;}},
  ban:(id:string,banned:boolean)=>request('/auth/v1/admin/users/'+id,'PUT',{ban_duration:banned?'876000h':'none'}),
  remove:(id:string)=>request('/auth/v1/admin/users/'+id,'DELETE'),
  recovery:(email:string)=>request('/auth/v1/admin/generate_link','POST',{type:'recovery',email})
};
Deno.serve(createHandler({db,auth}));
