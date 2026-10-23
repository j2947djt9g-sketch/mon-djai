-- Real-database verification using synthetic identities; every change is rolled back.
begin;
insert into auth.users(id,email,banned_until) values
 ('f0000000-0000-4000-8000-000000000001','masterboard-fixture-owner@example.invalid',null),
 ('f0000000-0000-4000-8000-000000000002','masterboard-fixture-member@example.invalid',null);
insert into public.clair_masterboard_admins(user_id) values('f0000000-0000-4000-8000-000000000001');
insert into public.clair_budgets(user_id,payload,revision,operation_id,display_name)
values('f0000000-0000-4000-8000-000000000002','{"version":3,"transactions":[],"rules":[],"preferences":{},"currency":"EUR"}',1,gen_random_uuid(),'Fixture');
set local role service_role;
do $$ declare d date; denied boolean:=false;begin
 d:=public.clair_masterboard_renew('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','2027-01-31');
 if d<>'2027-02-28' then raise exception 'Month end renewal failed: %',d;end if;
 d:=public.clair_masterboard_renew('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','2027-02-01');
 if d<>'2027-03-28' then raise exception 'Renewal lost paid time';end if;
 begin perform public.clair_masterboard_renew('f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000002','2027-01-31');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Ordinary user renewed';end if;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean:=false;n integer;begin
 select count(*) into n from public.clair_budgets;
 if n<>1 then raise exception 'Own budget access broken: %',n;end if;
 begin perform * from public.clair_masterboard_admins;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Admin allowlist exposed';end if;
 denied:=false;
 begin perform * from public.clair_masterboard_mail;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Mails exposed';end if;
end;$$;
reset role;
-- A stale JWT is still rejected by RLS once the synthetic member is banned.
update auth.users set banned_until=now()+interval '1 day' where id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ declare n integer;begin
 select count(*) into n from public.clair_budgets;if n<>0 then raise exception 'Banned account read budget';end if;
 update public.clair_budgets set display_name='should not save';get diagnostics n=row_count;
 if n<>0 then raise exception 'Banned account wrote budget';end if;
end;$$;
reset role;
update auth.users set banned_until=null where id='f0000000-0000-4000-8000-000000000002';
-- A test subscription, even years overdue, must not affect budget access.
update public.clair_masterboard_subscriptions set test_until='2000-01-01' where user_id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ declare n integer;begin select count(*) into n from public.clair_budgets;if n<>1 then raise exception 'Test expiry blocked free use';end if;end;$$;
reset role;
do $$ declare denied boolean:=false;begin
 begin update public.clair_masterboard_settings set mode='paid';exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Paid mode enabled without signal';end if;
end;$$;
set local role anon;
do $$ declare denied boolean:=false;begin
 begin perform * from public.clair_masterboard_settings;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous access to settings';end if;
end;$$;
reset role;
rollback;
select 'PASS: month-end renewals, accumulated test time, admin-only renewal, private mails and settings, own-budget isolation, stale JWT suspension, restore and perpetual free testing; all fixtures rolled back' as result;
