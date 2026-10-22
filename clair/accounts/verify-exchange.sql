-- Disposable CI database only. Rebuild a realistic owner-protected ledger.
drop table public.clair_budgets;
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;
\ir schema.sql
\ir currency-compatibility.sql
\ir exchange.sql
insert into auth.users(id) values('8450886d-891a-40e2-995e-ea46bb1409bc') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','8450886d-891a-40e2-995e-ea46bb1409bc',false);
do $$
declare r jsonb; op uuid:=gen_random_uuid(); blocked boolean; base jsonb:='{"version":3,"currency":"EUR","initialized":true,"setupDone":true,"openingCents":100000,"openingBalanceDate":"2026-10-20","transactions":[],"rules":[],"savingsProjects":[],"fixedExpenses":[],"budgets":{},"budgetOverrides":{},"savingsGoal":0,"preferences":{}}';
begin
  insert into public.clair_budgets(user_id,payload,revision,operation_id) values(auth.uid(),base,1,gen_random_uuid());
  r:=public.convert_clair_currency('XOF',1,op,(now() at time zone 'Europe/Paris')::date);
  if r->>'saved'<>'true' or r#>>'{row,payload,currency}'<>'XOF' or r#>>'{row,payload,currencyRevision}'<>'1' then raise exception 'Conversion failed';end if;
  if public.convert_clair_currency('XOF',1,op,(now() at time zone 'Europe/Paris')::date)<>r then raise exception 'Retry not idempotent';end if;
  if public.convert_clair_currency('USD',1,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date)->>'saved'<>'false' then raise exception 'Stale revision accepted';end if;
  blocked:=false;begin update public.clair_budgets set payload=payload||'{"currency":"EUR"}';exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Direct currency mutation allowed';end if;
  r:=public.convert_clair_currency('EUR',2,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date);
  blocked:=false;begin update public.clair_budgets set payload=payload-'currencyRevision';exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Old client removed conversion generation after round trip';end if;
end;$$;
select set_config('request.jwt.claim.sub','da265d1f-7120-4bb9-b357-0753c31a847a',false);
do $$begin if public.convert_clair_currency('USD',3,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date)->>'saved'<>'false' then raise exception 'Cross-account access';end if;end;$$;
reset role;
select 'PASS conversion RPC: owner isolation, revision conflict, idempotency, direct-mutation rejection and stale clients after a round trip' as result;
