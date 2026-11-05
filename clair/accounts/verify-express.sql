-- Disposable CI database only, after verify-exchange.sql and FX vectors.
\ir express-compatibility.sql
insert into auth.users(id) values('8450886d-891a-40e2-995e-ea46bb1409bc') on conflict do nothing;
delete from public.clair_budgets where user_id='8450886d-891a-40e2-995e-ea46bb1409bc';
set role authenticated;
select set_config('request.jwt.claim.sub','8450886d-891a-40e2-995e-ea46bb1409bc',false);
do $$
declare blocked boolean; op uuid:=gen_random_uuid(); r jsonb;
  provenance jsonb:='{"source":"express","createdAt":"2026-11-05T12:00:00.000Z","originalCurrency":"GBP","accountId":"current-budget","idempotencyKey":"express-1"}';
  base jsonb:='{"version":3,"currency":"GBP","initialized":true,"setupDone":true,"expressSchema":1,"openingCents":100000,"openingBalanceDate":"2026-11-01","transactions":[],"rules":[],"savingsProjects":[],"fixedExpenses":[],"budgets":{},"budgetOverrides":{},"savingsGoal":0,"preferences":{}}';
begin
  base:=jsonb_set(base,'{transactions}',jsonb_build_array(jsonb_build_object('id','express-1','type','expense','date','2026-11-05','amountCents',300,'express',provenance)));
  insert into public.clair_budgets(user_id,payload,revision,operation_id) values(auth.uid(),base,1,op);
  update public.clair_budgets set payload=payload||'{"openingCents":120000}';
  blocked:=false;begin update public.clair_budgets set payload=payload-'expressSchema';exception when check_violation then blocked:=true;end;
  if not blocked then raise exception 'Express capability stripped';end if;
  blocked:=false;begin update public.clair_budgets set payload=payload#-'{transactions,0,express}';exception when check_violation then blocked:=true;end;
  if not blocked then raise exception 'Express provenance stripped';end if;
  blocked:=false;begin update public.clair_budgets set payload=jsonb_set(payload,'{transactions,0,express,originalCurrency}','"EUR"');exception when check_violation then blocked:=true;end;
  if not blocked then raise exception 'Express provenance changed';end if;
  blocked:=false;begin update public.clair_budgets set payload=payload||'{"currency":"EUR"}';exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'Unauthorized GBP currency mutation';end if;
  blocked:=false;begin r:=public.convert_clair_currency('EUR',1,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date);exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'Unverified GBP rate accepted';end if;
  -- Explicit transaction deletion and reset preserve the capability marker.
  update public.clair_budgets set payload=jsonb_set(payload,'{transactions}','[]');
  update public.clair_budgets set payload=payload||'{"initialized":false,"transactions":[],"preferences":{}}';
  -- Re-setup in EUR then exercise the real RPC, proving currency_operation still works.
  update public.clair_budgets set payload=payload||'{"initialized":true,"currency":"EUR"}';
  r:=public.convert_clair_currency('USD',1,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date);
  if r->>'saved'<>'true' or r#>>'{row,payload,currency}'<>'USD' or r#>>'{row,payload,expressSchema}'<>'1' then raise exception 'Authorized conversion or capability preservation failed';end if;
end;$$;
reset role;
select 'PASS Express SQL: GBP native, downgrade/provenance rejection, explicit delete/reset, unverified GBP refusal and authorized currency operation' as result;
