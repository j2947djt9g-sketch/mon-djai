-- Isolated fixtures only. All data is rolled back.
begin;
create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL %',label;end if;end;$$;
do $$
declare uid uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); h text:=repeat('a',64); r jsonb; a uuid; old_a uuid; deadline timestamptz; n integer;
begin
 insert into auth.users(id,email) values(uid,'v2@example.invalid');
 perform public.clair_request_device_unlock(rid,'v2@example.invalid',h,'Fixture',repeat('f',64));
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='pending','pending');
 update public.clair_device_unlocks set status='approving' where id=rid;
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='pending','approving');
 update public.clair_device_unlocks set status='approved',user_id=uid where id=rid;
 select expires_at into deadline from public.clair_device_unlocks where id=rid;
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,repeat('b',64))->>'state'='expired','wrong secret');
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(gen_random_uuid(),h)->>'state'='expired','wrong id');
 r:=public.clair_reserve_device_unlock_v2(rid,h);a:=(r->>'attempt_id')::uuid;
 perform pg_temp.check(r->>'state'='reserved' and r->>'user_id'=uid::text,'reserve owner');
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='pending','active reserved lease');
 perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,repeat('b',64),a),'dispatch wrong secret');
 perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,h,gen_random_uuid()),'dispatch wrong attempt');
 perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,a,'issued'),'finish before dispatch');
 old_a:=a;update public.clair_device_unlocks set lease_until=clock_timestamp()-interval '1 second' where id=rid;
 r:=public.clair_reserve_device_unlock_v2(rid,h);a:=(r->>'attempt_id')::uuid;
 perform pg_temp.check(a<>old_a,'expired reserve replaced');
 perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,h,old_a),'old worker fenced');
 perform pg_temp.check(public.clair_dispatch_device_unlock_v2(rid,h,a),'dispatch');
 perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,h,a),'dispatch single use');
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='pending','active dispatched lease');
 perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,old_a,'not_issued'),'stale finish');
 perform pg_temp.check(public.clair_finish_device_unlock_v2(rid,h,a,'not_issued'),'safe preflight finish');
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='pending','backoff');
 update public.clair_device_unlocks set retry_after=clock_timestamp()-interval '1 second' where id=rid;
 r:=public.clair_reserve_device_unlock_v2(rid,h);a:=(r->>'attempt_id')::uuid;
 perform public.clair_dispatch_device_unlock_v2(rid,h,a);
 perform pg_temp.check(public.clair_finish_device_unlock_v2(rid,h,a,'issued'),'issued finish');
 perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,a,'not_issued'),'issued cannot reopen');
 perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','issued no retry');
 perform pg_temp.check(not public.clair_complete_device_unlock(rid,h,gen_random_uuid()),'wrong owner complete');
 perform pg_temp.check(public.clair_complete_device_unlock(rid,h,uid),'correct complete');
 perform pg_temp.check(not public.clair_complete_device_unlock(rid,h,uid),'complete replay');
 perform pg_temp.check((select status='closed' from public.clair_account_help where id=rid),'help closed');
 perform pg_temp.check((select expires_at=deadline and user_id=uid and email='v2@example.invalid' and secret_hash=repeat('0',64) from public.clair_device_unlocks where id=rid),'expiry identity and consumption');
 -- New isolated row per remaining boundary, without public request quotas.
 for n in 1..9 loop
  rid:=gen_random_uuid();insert into public.clair_account_help(id,email,reason,fingerprint) values(rid,'boundary@example.invalid','access_problem',repeat('f',64));
  insert into public.clair_device_unlocks(id,email,secret_hash,device_label,fingerprint,status,user_id) values(rid,'boundary@example.invalid',h,'Fixture','fixture','approved',uid);
  if n=1 then -- Legacy issued, including stale lease and unused attempt budget.
   update public.clair_device_unlocks set status='issued',lease_until=clock_timestamp()-interval '1 hour',issue_count=1 where id=rid;
   perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','legacy issued closed');
   perform pg_temp.check(public.clair_complete_device_unlock(rid,h,uid),'legacy completion');continue;
  elsif n=2 then
   perform pg_temp.check(public.clair_claim_device_unlock(rid,h)->>'state'='ready','old server works on additive schema');
   perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','old winner excludes v2');continue;
  elsif n=3 then
   update public.clair_device_unlocks set expires_at=clock_timestamp()-interval '1 second' where id=rid;
   perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','expired reserve');continue;
  elsif n=4 then
   update public.clair_device_unlocks set issue_count=5 where id=rid;
   perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','bounded five reservations');continue;
  end if;
  r:=public.clair_reserve_device_unlock_v2(rid,h);a:=(r->>'attempt_id')::uuid;
  perform pg_temp.check(public.clair_claim_device_unlock(rid,h)->>'state'='pending','v2 excludes old server');
  if n=5 then
   update public.clair_device_unlocks set expires_at=clock_timestamp()-interval '1 second' where id=rid;
   perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,h,a),'expiration before dispatch');continue;
  elsif n=6 then
   update public.clair_device_unlocks set lease_until=clock_timestamp()-interval '1 second' where id=rid;
   perform pg_temp.check(not public.clair_dispatch_device_unlock_v2(rid,h,a),'lease expiration before dispatch');continue;
  end if;
  perform public.clair_dispatch_device_unlock_v2(rid,h,a);
  if n=7 then
   perform pg_temp.check(public.clair_finish_device_unlock_v2(rid,h,a,'unknown'),'explicit unknown');
  elsif n=8 then
   update public.clair_device_unlocks set lease_until=clock_timestamp()-interval '1 second' where id=rid;
   perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,a,'issued'),'late result not released');
  else
   update public.clair_device_unlocks set expires_at=clock_timestamp()-interval '1 second' where id=rid;
   perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,a,'issued'),'absolute expiry before finish');
  end if;
  perform pg_temp.check(public.clair_reserve_device_unlock_v2(rid,h)->>'state'='expired','unknown/expired never retried');
  perform pg_temp.check(not public.clair_finish_device_unlock_v2(rid,h,a,'not_issued'),'late safe assertion cannot reopen');
 end loop;
end;$$;
-- Effective roles exercise all RPCs, including privileges inherited from PUBLIC.
do $$
declare role_name text; f record; operation text; args text;
begin
 perform pg_temp.check((select relrowsecurity from pg_class where oid='public.clair_device_unlocks'::regclass),'RLS enabled');
 perform pg_temp.check(not exists(select 1 from pg_policy where polrelid='public.clair_device_unlocks'::regclass),'no public policies');
 for f in select p.oid,p.proname,p.prosecdef,p.proconfig,pg_get_function_identity_arguments(p.oid) as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'clair_%device_unlock%' loop
  perform pg_temp.check(not f.prosecdef and 'search_path=""'=any(f.proconfig),'invoker empty search path '||f.proname);
  perform pg_temp.check(has_function_privilege('service_role',f.oid,'execute'),'service RPC '||f.proname);
  select string_agg('NULL::'||format_type(t,null),',') into args from pg_proc p cross join lateral unnest(p.proargtypes) t where p.oid=f.oid;
  foreach role_name in array array['anon','authenticated'] loop
   perform pg_temp.check(not has_function_privilege(role_name,f.oid,'execute'),'RPC ACL '||f.proname);
   execute format('set local role %I',role_name);
   begin execute format('select public.%I(%s)',f.proname,args);raise exception 'RPC exposed';exception when insufficient_privilege then null;end;
   reset role;
  end loop;
 end loop;
 foreach role_name in array array['anon','authenticated'] loop
  foreach operation in array array['select secret_hash,attempt_id from public.clair_device_unlocks','insert into public.clair_device_unlocks(id) values(gen_random_uuid())','update public.clair_device_unlocks set attempt_id=gen_random_uuid()','delete from public.clair_device_unlocks'] loop
   execute format('set local role %I',role_name);
   begin execute operation;raise exception 'Table exposed';exception when insufficient_privilege then null;end;
   reset role;
  end loop;
 end loop;
end;$$;
set local role service_role;
select public.clair_reserve_device_unlock_v2(gen_random_uuid(),repeat('a',64));
reset role;
rollback;
select 'PASS v2 transitions, fencing, old server compatibility, effective ACL/RLS and rollback' as result;
