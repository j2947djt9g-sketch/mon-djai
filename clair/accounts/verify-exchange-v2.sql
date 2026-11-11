-- Disposable CI database only. Rebuild a realistic owner-protected ledger.
drop table public.clair_budgets;
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;
\ir schema.sql
\ir currency-compatibility.sql
\ir exchange.sql
\ir express-compatibility.sql
-- Apply the additive migration only inside this disposable test fixture.
\ir exchange-v2.sql
insert into auth.users(id) values('8450886d-891a-40e2-995e-ea46bb1409bc') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','8450886d-891a-40e2-995e-ea46bb1409bc',false);
do $$
declare r jsonb; op uuid:=gen_random_uuid(); blocked boolean; base jsonb:='{"version":3,"currency":"EUR","initialized":true,"setupDone":true,"openingCents":100000,"openingBalanceDate":"2026-10-20","transactions":[],"rules":[],"savingsProjects":[],"fixedExpenses":[],"budgets":{},"budgetOverrides":{},"savingsGoal":0,"preferences":{}}';
begin
  insert into public.clair_budgets(user_id,payload,revision,operation_id) values(auth.uid(),base,1,gen_random_uuid());
  r:=public.convert_clair_currency_v2('XOF',1,op,(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
  if r->>'saved'<>'true' or r#>>'{row,payload,currency}'<>'XOF' or r#>>'{row,payload,currencyRevision}'<>'1' then raise exception 'Conversion failed';end if;
  if public.convert_clair_currency_v2('XOF',1,op,(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11')<>r then raise exception 'Retry not idempotent';end if;
  if public.convert_clair_currency_v2('USD',1,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11')->>'saved'<>'false' then raise exception 'Stale revision accepted';end if;
  blocked:=false;begin update public.clair_budgets set payload=payload||'{"currency":"EUR"}';exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Direct currency mutation allowed';end if;
  r:=public.convert_clair_currency_v2('EUR',2,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
  blocked:=false;begin update public.clair_budgets set payload=payload-'currencyRevision';exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Old client removed conversion generation after round trip';end if;
end;$$;
select set_config('request.jwt.claim.sub','da265d1f-7120-4bb9-b357-0753c31a847a',false);
do $$begin if public.convert_clair_currency_v2('USD',3,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11')->>'saved'<>'false' then raise exception 'Cross-account access';end if;end;$$;
reset role;
select 'PASS v2 conversion RPC: owner isolation, revision conflict, idempotency, direct-mutation rejection and stale clients after a round trip' as result;

do $$declare blocked boolean:=false;begin
  begin perform public.clair_fx_amount_v2(100,'EUR','MAD','unknown');exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'Unknown policy accepted';end if;
  blocked:=false;
  begin perform public.clair_fx_amount_v2(100,'EUR','MAD',null);exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'Missing policy accepted';end if;
  if public.clair_fx_amount_v2(100000,'EUR','MAD','inforeuro-2026-11')<>1098365 then raise exception 'MAD vector mismatch';end if;
  if public.clair_fx_amount(100000,'EUR','USD')<>112087 then raise exception 'Legacy rate changed';end if;
end;$$;
-- No production accounts: every fixture above is confined to this disposable database.
set role anon;
do $$declare blocked boolean:=false;begin
  begin perform public.convert_clair_currency_v2('USD',1,gen_random_uuid(),current_date,'inforeuro-2026-11');exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Anonymous conversion allowed';end if;
end;$$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','8450886d-891a-40e2-995e-ea46bb1409bc',false);
do $$declare before_row jsonb; after_row jsonb; blocked boolean; code text; r jsonb; rev bigint;begin
  select to_jsonb(b) into before_row from public.clair_budgets b where user_id=auth.uid();
  foreach code in array array['EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF'] loop
    select revision into rev from public.clair_budgets where user_id=auth.uid();
    r:=public.convert_clair_currency_v2(code,rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
    if r->>'saved'<>'true' or r#>>'{row,payload,currency}'<>code then raise exception 'RPC currency failed: %',code;end if;
  end loop;
  select to_jsonb(b) into before_row from public.clair_budgets b where user_id=auth.uid();
  blocked:=false;
  begin perform public.convert_clair_currency_v2('EUR',(before_row->>'revision')::bigint,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'unknown');exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'RPC accepted unknown policy';end if;
  blocked:=false;
  begin perform public.convert_clair_currency_v2('EUR',(before_row->>'revision')::bigint,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date-3,'inforeuro-2026-11');exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'RPC accepted expired preview date';end if;
  select to_jsonb(b) into after_row from public.clair_budgets b where user_id=auth.uid();
  if after_row<>before_row then raise exception 'Rejected conversion changed ledger';end if;
end;$$;
reset role;
