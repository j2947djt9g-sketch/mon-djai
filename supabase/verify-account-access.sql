-- Synthetic identities only; account and budget changes are rolled back.
begin;
insert into auth.users(id,email) values
 ('f0300000-0000-4000-8000-000000000001','suspension-fixture@example.invalid'),
 ('f0300000-0000-4000-8000-000000000002','active-fixture@example.invalid');
insert into public.clair_budgets(user_id,payload,revision,operation_id) values
 ('f0300000-0000-4000-8000-000000000001','{"version":3,"currency":"EUR","transactions":[],"rules":[],"preferences":{}}',1,gen_random_uuid());
select set_config('request.jwt.claims','{"sub":"f0300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if public.clair_account_active() is distinct from true then raise exception 'Active account denied';end if;end;$$;
reset role;
update auth.users set banned_until=now()+interval '1 day' where id='f0300000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ declare n integer;r jsonb;begin
 if public.clair_account_active() is distinct from false then raise exception 'Stale JWT bypassed suspension';end if;
 update public.clair_budgets set display_name='Blocked';get diagnostics n=row_count;
 if n<>0 then raise exception 'Suspended account wrote directly';end if;
 r:=public.save_clair_budget('{"version":3,"currency":"EUR","transactions":[],"rules":[],"preferences":{}}',1,gen_random_uuid(),'Blocked');
 if (r->>'saved')::boolean then raise exception 'Suspended account saved through RPC';end if;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"f0300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin if public.clair_account_active() is distinct from true then raise exception 'Another account inherited suspension';end if;end;$$;
reset role;
update auth.users set banned_until=null where id='f0300000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"f0300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n integer;begin
 if public.clair_account_active() is distinct from true then raise exception 'Restored account denied';end if;
 select count(*) into n from public.clair_budgets;
 if n<>1 then raise exception 'History lost after restoration';end if;
end;$$;
reset role;
set local role anon;
do $$ declare denied boolean:=false;begin
 begin perform public.clair_account_active();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous caller accessed account status';end if;
end;$$;
reset role;
rollback;
select 'PASS account access: live suspension despite stale JWT, direct and RPC writes blocked, restored history, other-account isolation and anonymous denial; fixtures rolled back' as result;
