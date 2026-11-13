/* Clair email confirmation. SDK callbacks must be consumed before cleanCallback. */
(function(root){
  'use strict';
  const REDIRECT='https://clair-budget.vercel.app/clair/?auth=confirmation';
  const AUTH_KEYS=['access_token','refresh_token','token_type','expires_in','expires_at','provider_token','provider_refresh_token','code','token','token_hash','error','error_code','error_description'];
  const CREDENTIAL_KEYS=['access_token','refresh_token','code','token','token_hash'];
  const memory=new Map(),pending=new Set();
  function normalizeEmail(value){return String(value==null?'':value).trim().toLowerCase();}
  function confirmationRedirect(){return REDIRECT;}
  function urlOf(location){
    try{
      if(typeof location==='string')return new URL(location,REDIRECT);
      if(location?.href)return new URL(location.href,REDIRECT);
      return new URL((location?.pathname||'/clair/')+(location?.search||'')+(location?.hash||''),REDIRECT);
    }catch(_){return new URL(REDIRECT.replace('?auth=confirmation',''));}
  }
  function parts(location){
    const url=urlOf(location),fragment=url.hash.slice(1);
    return {url,query:url.searchParams,hash:new URLSearchParams(fragment.includes('=')?fragment:''),fragment};
  }
  function callback(location){
    const {query,hash}=parts(location),both=[query,hash];
    const values=key=>both.flatMap(params=>params.getAll(key)).filter(Boolean);
    const hasError=['error','error_code','error_description'].some(key=>values(key).length>0);
    const hasCredentials=CREDENTIAL_KEYS.some(key=>values(key).length>0);
    // SDK 2.102.0 consumes hash first, then query; the last value wins even when empty.
    const effective=new Map();
    for(const params of [hash,query])params.forEach((value,key)=>effective.set(key,value));
    const hasImplicitCredentials=!!(effective.get('access_token')&&effective.get('refresh_token'));
    const types=values('type'),marked=values('auth').includes('confirmation');
    const contexts=new Set(types.map(type=>type==='signup'||type==='email_change'?'confirmation':type==='recovery'?'recovery':'unknown'));
    if(marked)contexts.add('confirmation');
    let kind=null;
    if(marked||hasError||hasCredentials||types.some(type=>['signup','email_change','recovery'].includes(type))){
      kind=contexts.size===1?[...contexts][0]:'unknown';
    }
    const code=values('error_code')[0];
    return {kind,errorCode:code&&/^[a-z0-9_]{1,64}$/.test(code)?code:null,hasError,hasCredentials,hasImplicitCredentials};
  }
  // Explicitly invoked by the caller only after auth.initialize()/getSession settles.
  function cleanCallback(location,history){
    const {url,query,hash,fragment}=parts(location);
    if(callback(location).kind===null)return;
    const original=url.pathname+url.search+url.hash;
    for(const params of [query,hash]){
      AUTH_KEYS.forEach(key=>params.delete(key));
      const types=params.getAll('type'),remaining=types.filter(type=>!['signup','recovery','email_change','invite','magiclink','email'].includes(type));
      if(remaining.length!==types.length){params.delete('type');remaining.forEach(type=>params.append('type',type));}
      if(params.get('auth')==='confirmation')params.delete('auth');
    }
    const queryText=query.toString(),hashText=fragment.includes('=')?hash.toString():fragment;
    const clean=url.pathname+(queryText?'?'+queryText:'')+(hashText?'#'+hashText:'');
    if(clean!==original){try{history?.replaceState(history.state,'',clean);}catch(_){/* A restricted history must not prevent account access. */}}
  }
  function message(error){
    const code=typeof error==='string'?error:error?.code;
    if(code==='confirmation_cooldown')return 'Patiente encore '+Math.max(1,Math.min(60,Math.ceil(Number(error?.waitSeconds)||60)))+' secondes avant de demander un nouveau lien.';
    if(code==='request_in_progress')return 'Une demande est déjà en cours. Patiente un instant.';
    if(code==='otp_expired'||code==='otp_disabled')return 'Ce lien de confirmation a expiré ou a déjà été utilisé. Demande un nouveau lien.';
    if(code==='email_not_confirmed')return 'Confirme ton adresse e-mail pour terminer la connexion.';
    if(code==='email_address_invalid'||code==='validation_failed')return 'Vérifie ton adresse e-mail et réessaie.';
    if(error?.status===429||code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return 'Trop de demandes ont été envoyées. Patiente avant de réessayer.';
    return 'La demande de confirmation n’a pas pu aboutir. Réessaie dans un instant.';
  }
  function safeDefault(name){try{return root[name];}catch(_){return null;}}
  function create(options={}){
    const auth=options.auth,storage=options.storage===undefined?safeDefault('localStorage'):options.storage;
    const crypto=options.crypto===undefined?safeDefault('crypto'):options.crypto,now=options.now||(()=>Date.now());
    const config=safeDefault('CLAIR_ACCOUNT_CONFIG');
    const project=String(auth?.url||config?.url||'clair-default').replace(/\/+$/,'');
    const records=new Map();
    function record(email){
      email=normalizeEmail(email);let value=records.get(email);
      if(!value){
        const scope=project+'\n'+email;
        if(!memory.has(scope))memory.set(scope,{until:0});
        value={state:memory.get(scope),scope,key:null,preparing:null};records.set(email,value);
      }
      return value;
    }
    function read(value){
      if(value.key&&storage){try{const stored=Number(storage.getItem(value.key));if(Number.isSafeInteger(stored)&&stored>0&&stored<=now()+60000)value.state.until=Math.max(value.state.until,stored);}catch(_){/* Keep the in-memory deadline. */}}
      return value;
    }
    async function prepare(email){
      const value=record(email);
      if(!value.preparing)value.preparing=(async()=>{
        try{
          if(crypto?.subtle?.digest&&typeof TextEncoder!=='undefined'){
            const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.scope));
            value.key='clair-auth-email-v1-'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
          }
        }catch(_){/* No plaintext fallback key is ever persisted. */}
      })();
      await value.preparing;read(value);
    }
    function waitSeconds(email){
      const value=read(record(email));
      return Math.min(60,Math.max(0,Math.ceil((value.state.until-now())/1000)));
    }
    async function markRequested(email){
      await prepare(email);const value=record(email);
      value.state.until=Math.max(value.state.until,now()+60000);
      if(value.key&&storage){try{storage.setItem(value.key,String(value.state.until));}catch(_){/* The request still has its memory cooldown. */}}
    }
    function failure(error){
      const allowed=['confirmation_cooldown','request_in_progress','otp_expired','otp_disabled','email_not_confirmed','email_address_invalid','validation_failed','over_email_send_rate_limit','over_request_rate_limit','provider_disabled'];
      const code=allowed.includes(error?.code)?error.code:'confirmation_failed';
      const clean={code};
      if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)clean.status=error.status;
      if(code==='confirmation_cooldown')clean.waitSeconds=Math.max(1,Math.min(60,Math.ceil(Number(error.waitSeconds)||60)));
      clean.message=message(clean);return {accepted:false,error:clean};
    }
    async function signup({email,password,displayName}={}){
      if(pending.has(project))return {data:null,error:failure({code:'request_in_progress'}).error};
      pending.add(project);
      try{
        return await auth.signUp({email:normalizeEmail(email),password,options:{emailRedirectTo:confirmationRedirect(),data:{display_name:String(displayName||'').slice(0,64)}}});
      }catch(error){return {data:null,error:failure(error).error};}
      finally{pending.delete(project);}
    }
    async function resend(email){
      if(pending.has(project))return failure({code:'request_in_progress'});
      pending.add(project);
      try{
        email=normalizeEmail(email);await prepare(email);
        const wait=waitSeconds(email);
        if(wait)return failure({code:'confirmation_cooldown',waitSeconds:wait});
        await markRequested(email);
        const result=await auth.resend({type:'signup',email,options:{emailRedirectTo:confirmationRedirect()}});
        if(!result||result.error!==null)return failure(result?.error);
        return {accepted:true,error:null};
      }catch(error){return failure(error);}
      finally{pending.delete(project);}
    }
    return {signup,prepare,markRequested,resend,waitSeconds};
  }
  root.ClairAuthEmail={normalizeEmail,confirmationRedirect,callback,cleanCallback,message,create};
})(typeof window!=='undefined'?window:globalThis);
