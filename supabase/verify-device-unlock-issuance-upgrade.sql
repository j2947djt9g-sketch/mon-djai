-- Run only on an isolated historical baseline, before applying v2.
\set ON_ERROR_STOP on
insert into auth.users(id,email) values('b3000000-0000-4000-8000-000000000001','upgrade@example.invalid');
insert into public.clair_account_help(id,email,reason,fingerprint)
 select ('b3000000-0000-4000-8000-00000000000'||i)::uuid,'upgrade@example.invalid','access_problem',repeat('f',64) from generate_series(2,6) i;
insert into public.clair_device_unlocks(id,email,secret_hash,device_label,fingerprint,status,user_id,issue_count,lease_until)
 select ('b3000000-0000-4000-8000-00000000000'||i)::uuid,'upgrade@example.invalid',repeat('a',64),'Upgrade fixture',repeat('f',64),
 (array['pending','approving','approved','issued','completed'])[i-1],'b3000000-0000-4000-8000-000000000001',1,clock_timestamp()-interval '1 hour' from generate_series(2,6) i;
create temporary table before_unlock as select id,to_jsonb(u) as original from public.clair_device_unlocks u;
create temporary table before_help as select id,to_jsonb(h) as original from public.clair_account_help h;
\ir device-unlock-issuance-v2.sql
do $$begin
 if exists(select 1 from before_unlock b full join public.clair_device_unlocks u using(id) where b.original is distinct from to_jsonb(u)-'issue_phase'-'attempt_id'-'retry_after') then raise exception 'Legacy unlock changed';end if;
 if exists(select 1 from before_help b full join public.clair_account_help h using(id) where b.original is distinct from to_jsonb(h)) then raise exception 'Legacy help changed';end if;
 if (public.clair_reserve_device_unlock_v2('b3000000-0000-4000-8000-000000000005',repeat('a',64))->>'state') is distinct from 'expired' then raise exception 'Legacy issued reopened';end if;
 if public.clair_complete_device_unlock('b3000000-0000-4000-8000-000000000005',repeat('a',64),'b3000000-0000-4000-8000-000000000001') is distinct from true then raise exception 'Legacy issued cannot complete';end if;
end;$$;
delete from public.clair_account_help where id in (select id from before_unlock where original->>'email'='upgrade@example.invalid');
delete from auth.users where id='b3000000-0000-4000-8000-000000000001';
drop table before_unlock,before_help;
select 'PASS additive upgrade preserves all legacy columns and help rows; old issued completes' as result;
