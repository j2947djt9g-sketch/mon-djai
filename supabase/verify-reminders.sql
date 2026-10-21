begin;
insert into auth.users(id) values('00000000-0000-0000-0000-000000000101');
insert into public.clair_push_devices(device_id,user_id,subscription)
values(repeat('a',32),'00000000-0000-0000-0000-000000000101','{}');
do $$
declare device text:=repeat('a',32); token uuid:=gen_random_uuid();
begin
  if has_table_privilege('anon','public.clair_push_config','SELECT')
    or has_table_privilege('authenticated','public.clair_push_config','SELECT')
    or has_table_privilege('authenticated','public.clair_push_devices','UPDATE')
    or has_function_privilege('anon','public.clair_claim_push(text,text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.clair_claim_push(text,text,uuid)','EXECUTE')
  then raise exception 'Push resources exposed to client roles'; end if;
  if exists(select from pg_class where oid in('public.clair_push_devices'::regclass,'public.clair_push_config'::regclass,'public.clair_push_deliveries'::regclass) and not relrowsecurity)
  then raise exception 'RLS missing'; end if;
  if not public.clair_claim_push(device,'phone:2026-10-23',token) then raise exception 'Initial claim failed'; end if;
  if public.clair_claim_push(device,'phone:2026-10-23',gen_random_uuid()) then raise exception 'Concurrent claim accepted'; end if;
  update public.clair_push_deliveries set lease_until=now()-interval '1 minute';
  if not public.clair_claim_push(device,'phone:2026-10-23',gen_random_uuid()) then raise exception 'Expired claim not retryable'; end if;
  update public.clair_push_deliveries set lease_until=now()-interval '1 minute',sent_at=now();
  if public.clair_claim_push(device,'phone:2026-10-23',gen_random_uuid()) then raise exception 'Sent reminder claimed again'; end if;
  if not public.clair_claim_push(device,'phone:2026-11-23',token) then raise exception 'Next month was blocked'; end if;
  update public.clair_push_deliveries set attempts=3,lease_until=now()-interval '1 minute' where occurrence_key='phone:2026-11-23';
  if public.clair_claim_push(device,'phone:2026-11-23',gen_random_uuid()) then raise exception 'Retry limit bypassed'; end if;
end $$;
delete from auth.users where id='00000000-0000-0000-0000-000000000101';
do $$ begin
  if exists(select from public.clair_push_devices) or exists(select from public.clair_push_deliveries) then raise exception 'Account deletion left push data'; end if;
end $$;
rollback;
