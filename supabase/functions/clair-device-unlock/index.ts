import {createUnlockHandler} from './handler.mjs';
import {createUnlockAdapters} from './adapters.mjs';
const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
Deno.serve(createUnlockHandler({
 ...createUnlockAdapters({base,key}),
 fingerprint:async(req:Request)=>{
  const address=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,200);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'\n'+address));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 }
}));
