-- DISPOSABLE DATABASE ONLY. Run via tools/clair/tests/verify-advice-sql.cjs.
-- Synthetic UUIDs and auth.uid() are supplied by that runner. No remote database.
\ir schema.sql
\ir currency-compatibility.sql
\ir exchange.sql
\ir express-compatibility.sql
\ir savings-compatibility.sql
\ir exchange-v2.sql
-- BEGIN ADVICE GUARD
\ir advice-compatibility.sql
-- A second application proves the prepared additive source is repeatable.
\ir advice-compatibility.sql
-- END ADVICE GUARD

insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
create temp table advice_fixture(payload jsonb);
insert into advice_fixture values ('{"version":3,"currency":"EUR","initialized":true,"setupDone":true,"openingCents":100000,"openingBalanceDate":"2026-10-01","transactions":[{"id":"food","type":"expense","date":"2026-10-05","categoryId":"courses","amountCents":18500},{"id":"refund","type":"income","date":"2026-11-05","categoryId":"courses","amountCents":4500},{"id":"refund2","type":"income","date":"2026-11-06","categoryId":"courses","amountCents":500},{"id":"saving","type":"expense","date":"2026-10-07","categoryId":"epargne","savingsProjectId":"p1","amountCents":8000}],"rules":[],"savingsProjects":[{"id":"p1","targetCents":100000}],"fixedExpenses":[],"budgets":{},"budgetOverrides":{"2026-12":{"courses":140,"loisirs":150}},"savingsGoal":0,"preferences":{},"expressSchema":1,"savingsSchema":1,"adviceSchema":1,"advice":{"transactions":{"food":{"exceptional":true},"refund":{"nature":"refund","refundOf":"food"},"refund2":{"nature":"refund","refundOf":"food"}},"months":{"2026-10":{"through":"2026-10-31"}},"goals":{"2026-12":{"courses":{"amountCents":14000,"setOn":"2026-11-16"},"loisirs":{"amountCents":14000,"setOn":"2026-11-16"}}},"location":{"country":"FR","city":"Paris"}}}');
-- Legacy payloads are not rewritten. Explicit upgrade retains the ledger exactly.
do $$declare p jsonb; r jsonb; begin
  select payload into p from advice_fixture;
  r:=public.save_clair_budget(p-'adviceSchema'-'advice',0,gen_random_uuid(),'fixture');
  if r->>'saved'<>'true' or r#>'{row,payload}'<>p-'adviceSchema'-'advice' then raise exception 'Legacy payload changed'; end if;
  r:=public.save_clair_budget(p,1,gen_random_uuid(),'fixture');
  if r->>'saved'<>'true' or r#>'{row,payload}'<>p then raise exception 'Advice upgrade changed payload'; end if;
end;$$;
-- This must fail before the guard exists (red test).
do $$declare blocked boolean:=false; begin
  begin update public.clair_budgets set payload=payload-'adviceSchema'-'advice'; exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'FAIL: old client erased advice metadata'; end if;
end;$$;
select 'PASS advice marker downgrade protection' as result;

create function pg_temp.advice_reject(p jsonb, label text) returns void
language plpgsql security invoker set search_path='' as $$
declare blocked boolean:=false; before_row jsonb; after_row jsonb; begin
  select to_jsonb(b) into before_row from public.clair_budgets b where user_id=auth.uid();
  begin
    update public.clair_budgets set payload=p,revision=revision+1,operation_id=gen_random_uuid() where user_id=auth.uid();
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'Accepted malformed advice: %',label; end if;
  select to_jsonb(b) into after_row from public.clair_budgets b where user_id=auth.uid();
  if after_row is distinct from before_row then raise exception 'Rejected write changed ledger: %',label; end if;
end;$$;

do $$declare p jsonb; bad jsonb; k text; v jsonb; begin
  select payload into p from advice_fixture;
  foreach v in array array['2'::jsonb,'null'::jsonb,'"1"'::jsonb,'{}'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{adviceSchema}',v),'unknown marker');
  end loop;
  foreach v in array array['null'::jsonb,'[]'::jsonb,'true'::jsonb,'"context"'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice}',v),'context object type');
    foreach k in array array['transactions','months','goals','location'] loop
      perform pg_temp.advice_reject(jsonb_set(p,array['advice',k],v),'subcontext object type');
    end loop;
  end loop;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,unexpected}','true'),'unknown context key');
  foreach k in array array['missing','constructor','prototype','__proto__','bad.key'] loop
    perform pg_temp.advice_reject(jsonb_set(p,array['advice','transactions',k],'{"exceptional":false}'),'invalid annotation key/reference');
  end loop;
  foreach v in array array['null'::jsonb,'[]'::jsonb,'{"unknown":true}'::jsonb,'{"nature":"salary"}'::jsonb,
    '{"nature":null}'::jsonb,'{"nature":"income"}'::jsonb,'{"exceptional":"true"}'::jsonb,
    '{"exceptional":null}'::jsonb,'{"refundOf":"food"}'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,food}',v),'invalid expense annotation');
  end loop;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,refund}','{"nature":"expense"}'),'income direction');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,refund}','{"exceptional":true}'),'exceptional income');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,food}','{"nature":"transfer","exceptional":true}'),'exceptional transfer');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,food}','{"nature":"adjustment","exceptional":true}'),'exceptional adjustment');
  foreach k in array array['missing','refund2','constructor','bad.key'] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,refund,refundOf}',to_jsonb(k)),'refund target');
  end loop;
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,0,categoryId}','"epargne"'),'savings refund target');
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,1,categoryId}','"epargne"'),'savings reclassification');
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,0,date}','"2026-12-01"'),'refund predates expense');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions,food}','{"nature":"transfer"}'),'refund targets transfer');
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,1,amountCents}','18001'),'aggregate refund cap');
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,1,id}','"food"'),'duplicate ledger IDs');
  perform pg_temp.advice_reject(jsonb_set(p,'{transactions,1,type}','null'),'null ledger direction');
  foreach v in array array['-1'::jsonb,'10000000001'::jsonb,'0.5'::jsonb,'"100"'::jsonb,'null'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{transactions,0,amountCents}',v),'referenced ledger cents');
  end loop;
  foreach v in array array['null'::jsonb,'[]'::jsonb,'{"through":"2026-11-01"}'::jsonb,
    '{"through":"2026-10-32"}'::jsonb,'{"through":"2026-10-31","extra":1}'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice,months,2026-10}',v),'review');
  end loop;
  foreach k in array array['1999-12','2101-01','2026-13','2026-1'] loop
    perform pg_temp.advice_reject(jsonb_set(p,array['advice','months',k],'{"through":"2026-10-31"}'),'month bounds');
    perform pg_temp.advice_reject(jsonb_set(p,array['advice','goals',k],'{}'),'goal month bounds');
  end loop;
  foreach v in array array['null'::jsonb,'[]'::jsonb,'{"amountCents":0,"setOn":"2026-11-16"}'::jsonb,
    '{"amountCents":1.5,"setOn":"2026-11-16"}'::jsonb,'{"amountCents":10000000001,"setOn":"2026-11-16"}'::jsonb,
    '{"amountCents":"100","setOn":"2026-11-16"}'::jsonb,'{"amountCents":100,"setOn":"2026-02-29"}'::jsonb,
    '{"amountCents":100,"setOn":"1999-12-31"}'::jsonb,'{"amountCents":100,"setOn":"2101-01-01"}'::jsonb,
    '{"amountCents":100,"setOn":"2026-11-16","extra":1}'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice,goals,2026-12,courses}',v),'goal evidence');
  end loop;
  foreach k in array array['epargne','constructor','prototype','__proto__','bad.key'] loop
    perform pg_temp.advice_reject(jsonb_set(p,array['advice','goals','2026-12',k],'{"amountCents":100,"setOn":"2026-11-16"}'),'goal category');
  end loop;
  foreach v in array array['{"country":"fr"}'::jsonb,'{"country":"FRA"}'::jsonb,'{"country":null}'::jsonb,
    '{"city":null}'::jsonb,'{"city":5}'::jsonb,'{"lat":48}'::jsonb] loop
    perform pg_temp.advice_reject(jsonb_set(p,'{advice,location}',v),'location');
  end loop;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,location,city}',to_jsonb(repeat('x',101))),'city length');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,location,city}',to_jsonb(repeat('😀',51))),'UTF16 city length');
  select jsonb_object_agg('id'||n,'{}'::jsonb) into bad from generate_series(1,50001) n;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,transactions}',bad),'annotation count');
  select jsonb_object_agg(n::text,'{}'::jsonb) into bad from generate_series(1,2401) n;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,months}',bad),'review count');
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,goals}',bad),'goal month count');
  select jsonb_object_agg('cat'||n,'{"amountCents":100,"setOn":"2026-11-16"}'::jsonb) into bad from generate_series(1,201) n;
  perform pg_temp.advice_reject(jsonb_set(p,'{advice,goals,2026-12}',bad),'goal category count');
end;$$;
select 'PASS exact metadata types, keys, references, directions, savings, exceptions, aggregate refunds, dates, cents, goals, location and bounds' as result;

-- Optional nested fields, unlinked refunds, transfers, adjustments, false exceptional
-- and stale evidence are valid; no financial values are changed by this context.
do $$declare p jsonb; r jsonb; begin
  select payload into p from advice_fixture;
  update public.clair_budgets set payload=jsonb_set(p,'{advice}','{}');
  update public.clair_budgets set payload=p-'advice'; -- marker alone normalizes to empty context
  update public.clair_budgets set payload=jsonb_set(p,'{advice,transactions}','{"food":{"nature":"expense","exceptional":false},"refund":{"nature":"transfer"},"refund2":{"nature":"adjustment"}}');
  update public.clair_budgets set payload=jsonb_set(p,'{advice,transactions}','{"refund":{"nature":"refund"}}');
  update public.clair_budgets set payload=p;
  r:=public.save_clair_budget(p,1,gen_random_uuid(),'stale');
  if r->>'saved'<>'false' or r#>>'{row,revision}'<>'2' then raise exception 'CAS regression'; end if;
  r:=public.save_clair_budget(p,2,gen_random_uuid(),'valid');
  if r->>'saved'<>'true' or r#>>'{row,revision}'<>'3' then raise exception 'CAS save regression'; end if;
  if public.save_clair_budget(p,0,(r#>>'{row,operation_id}')::uuid,'retry')<>r then raise exception 'Idempotency regression'; end if;
end;$$;

-- Every reviewed month compares the same ordered financial projection as JS.
create function pg_temp.advice_review_change(candidate jsonb, expected_months jsonb, label text) returns void
language plpgsql security invoker set search_path='' as $$
declare p jsonb; r jsonb; rev bigint; begin
  select payload into p from pg_temp.advice_fixture;
  p:=jsonb_set(p,'{advice,months}','{"2026-09":{"through":"2026-09-30"},"2026-10":{"through":"2026-10-31"},"2026-11":{"through":"2026-11-30"},"2026-12":{"through":"2026-12-31"}}');
  -- Financial reset may invalidate prior reviews. A second unchanged save is
  -- the explicit review command, which must persist all four reviewed months.
  for i in 1..2 loop
    select revision into rev from public.clair_budgets where user_id=auth.uid();
    r:=public.save_clair_budget(p,rev,gen_random_uuid(),'fixture');
    if r->>'saved'<>'true' then raise exception 'Review test setup CAS conflict'; end if;
  end loop;
  select revision into rev from public.clair_budgets where user_id=auth.uid();
  candidate:=jsonb_set(candidate,'{advice,months}',p#>'{advice,months}');
  r:=public.save_clair_budget(candidate,rev,gen_random_uuid(),'edited');
  if r->>'saved'<>'true' or r#>'{row,payload,advice,months}' is distinct from expected_months then
    raise exception 'Stale review survived %: %',label,r#>'{row,payload,advice,months}'; end if;
  if r#>'{row,payload,transactions}' is distinct from candidate->'transactions' then
    raise exception 'Review reconciliation changed ledger: %',label; end if;
end;$$;
do $$declare p jsonb; c jsonb; all_months jsonb:='{"2026-09":{"through":"2026-09-30"},"2026-10":{"through":"2026-10-31"},"2026-11":{"through":"2026-11-30"},"2026-12":{"through":"2026-12-31"}}'; begin
  select payload into p from advice_fixture;
  perform pg_temp.advice_review_change(jsonb_set(p,'{transactions,0,amountCents}','19000'),all_months-'2026-10','amount edit');
  perform pg_temp.advice_review_change(jsonb_set(p,'{transactions,0,date}','"2026-10-06"'),all_months-'2026-10','same-month date edit');
  perform pg_temp.advice_review_change(jsonb_set(p,'{transactions,0,date}','"2026-09-05"'),all_months-'2026-09'-'2026-10','month move');
  perform pg_temp.advice_review_change(jsonb_set(p,'{transactions,0,categoryId}','"loisirs"'),all_months-'2026-10','category edit');
  c:=jsonb_set(p,'{transactions,2,type}','"expense"')#-'{advice,transactions,refund2}';
  perform pg_temp.advice_review_change(c,all_months-'2026-11','direction edit');
  perform pg_temp.advice_review_change(jsonb_set(p,'{advice,transactions,refund}','{"nature":"transfer"}'),all_months-'2026-11','nature edit');
  perform pg_temp.advice_review_change(p#-'{advice,transactions,refund,refundOf}',all_months-'2026-11','refund-link edit');
  c:=jsonb_set(p,'{transactions}',(p->'transactions')||'[{"id":"added","type":"income","date":"2026-12-02","categoryId":"autre","amountCents":100}]');
  perform pg_temp.advice_review_change(c,all_months-'2026-12','transaction addition');
  c:=(p#-'{transactions,2}')#-'{advice,transactions,refund2}';
  perform pg_temp.advice_review_change(c,all_months-'2026-11','transaction deletion');
  perform pg_temp.advice_review_change(jsonb_set(p,'{advice,transactions,food,exceptional}','false'),all_months,'exceptional-only preserves review');
  perform pg_temp.advice_review_change(jsonb_set(p,'{transactions,0,name}','"Corrected label"'),all_months,'label-only preserves review');
  select jsonb_set(p,'{transactions}',jsonb_agg(value order by n desc)) into c
    from jsonb_array_elements(p->'transactions') with ordinality rows(value,n);
  perform pg_temp.advice_review_change(c,all_months,'row order preserves review');
  perform pg_temp.advice_review_change(p,all_months,'unchanged finances accept review command');
end;$$;
select 'PASS non-FX CAS edits invalidate only affected monthly financial projections; exceptional-only and explicit review commands persist' as result;

-- Every supported FX route uses canonical converted overrides as its evidence.
do $$declare r jsonb; rev bigint; code text; p jsonb; begin
  foreach code in array array['XOF','EUR','USD','GBP','MAD','CAD','CHF','XAF'] loop
    select revision into rev from public.clair_budgets where user_id=auth.uid();
    r:=public.convert_clair_currency_v2(code,rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
    p:=r#>'{row,payload}';
    if r->>'saved'<>'true' or p->>'currency'<>code then raise exception 'FX failed: %',code; end if;
    if (p#>>'{advice,goals,2026-12,courses,amountCents}')::numeric is distinct from (p#>>'{budgetOverrides,2026-12,courses}')::numeric*100
      or p#>>'{advice,goals,2026-12,courses,setOn}'<>'2026-11-16' then raise exception 'FX evidence mismatch: %',code; end if;
    if p#>'{advice,goals,2026-12}' ? 'loisirs' then raise exception 'Stale evidence survived FX'; end if;
    if code in ('XOF','XAF') then
      perform pg_temp.advice_reject(jsonb_set(p,'{advice,goals,2026-12,courses,amountCents}','101'),'native CFA goal cents');
      perform pg_temp.advice_reject(jsonb_set(p,'{transactions,0,amountCents}','18501'),'native CFA ledger cents');
    end if;
  end loop;
  -- Native non-whole-CFA stale goal evidence must be dropped during conversion.
  select revision into rev from public.clair_budgets where user_id=auth.uid();
  r:=public.convert_clair_currency_v2('EUR',rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
  update public.clair_budgets set payload=jsonb_set(payload,'{advice,goals,2026-12,loisirs}','{"amountCents":12345,"setOn":"2026-11-16"}');
  select revision into rev from public.clair_budgets where user_id=auth.uid();
  r:=public.convert_clair_currency_v2('XOF',rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
  if r#>'{row,payload,advice,goals,2026-12}' ? 'loisirs' then raise exception 'Native invalid stale evidence survived'; end if;
end;$$;
select 'PASS eight currencies, canonical converted goal evidence, stale evidence removal and native CFA cents' as result;

-- EUR 0.20 -> CFA131, two EUR0.10 refunds -> CFA66 each. This is a
-- conversion disclosure issue: no ledger amount or refund nature may be lost.
do $$declare code text; p jsonb; r jsonb; rev bigint; begin
  foreach code in array array['XOF','XAF'] loop
    select revision into rev from public.clair_budgets where user_id=auth.uid();
    perform public.convert_clair_currency_v2('EUR',rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
    select payload into p from public.clair_budgets where user_id=auth.uid();
    p:=jsonb_set(p,'{transactions}', '[{"id":"food","type":"expense","date":"2026-10-05","categoryId":"courses","amountCents":20},{"id":"refund","type":"income","date":"2026-11-05","categoryId":"courses","amountCents":10},{"id":"refund2","type":"income","date":"2026-12-06","categoryId":"courses","amountCents":10}]');
    p:=jsonb_set(p,'{advice,transactions}','{"refund":{"nature":"refund","refundOf":"food"},"refund2":{"nature":"refund","refundOf":"food"}}');
    p:=jsonb_set(p,'{advice,months}','{"2026-09":{"through":"2026-09-30"},"2026-10":{"through":"2026-10-31"},"2026-11":{"through":"2026-11-30"},"2026-12":{"through":"2026-12-31"}}');
    -- Old stale EUR656 evidence would equal the converted CFA override for EUR1.
    -- Remove it, so a numerical coincidence cannot create historic verification.
    p:=jsonb_set(p,'{budgetOverrides}','{"2026-12":{"courses":1}}');
    p:=jsonb_set(p,'{advice,goals}','{"2026-12":{"courses":{"amountCents":65600,"setOn":"2026-11-16"}}}');
    update public.clair_budgets set payload=p;
    -- Review the unchanged new ledger separately before testing FX invalidation.
    update public.clair_budgets set payload=jsonb_set(payload,'{advice,months}',p#>'{advice,months}');
    select revision into rev from public.clair_budgets where user_id=auth.uid();
    r:=public.convert_clair_currency_v2(code,rev,gen_random_uuid(),(now() at time zone 'Europe/Paris')::date,'inforeuro-2026-11');
    p:=r#>'{row,payload}';
    if r->>'saved'<>'true' or p#>>'{transactions,0,amountCents}'<>'13100'
      or p#>>'{transactions,1,amountCents}'<>'6600' or p#>>'{transactions,2,amountCents}'<>'6600' then
      raise exception 'Rounded conversion changed ledger amounts: %',code; end if;
    if p#>'{advice,transactions,refund}'<>'{"nature":"refund"}'::jsonb
      or p#>'{advice,transactions,refund2}'<>'{"nature":"refund"}'::jsonb then
      raise exception 'Rounded refunds not disclosed as unlinked: %',code; end if;
    if p#>'{advice,months}'<>'{"2026-09":{"through":"2026-09-30"}}'::jsonb then
      raise exception 'Rounded refund review invalidation: %',code; end if;
    if p#>'{advice,goals,2026-12}' ? 'courses' then raise exception 'Stale goal became verified by FX coincidence'; end if;
  end loop;
end;$$;
select 'PASS XOF/XAF split-refund rounding: unchanged amounts, unlink all, clear affected reviews, preserve unrelated review' as result;

-- Existing guards still reject marker/provenance loss and direct currency changes.
do $$declare p jsonb; blocked boolean:=false; begin
  select payload into p from public.clair_budgets where user_id=auth.uid();
  begin update public.clair_budgets set payload=payload||'{"currency":"EUR"}'; exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'Currency guard disabled'; end if;
  p:=jsonb_set(p||'{"expressSchema":1,"savingsSchema":1,"savingsProjects":[]}',
    '{transactions,0,express}','{"fixture":"immutable"}');
  update public.clair_budgets set payload=p;
  perform pg_temp.advice_reject(p-'expressSchema','Express downgrade');
  perform pg_temp.advice_reject(p#-'{transactions,0,express}','Express provenance');
  perform pg_temp.advice_reject(p-'savingsSchema','savings downgrade');
end;$$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$declare affected bigint; r jsonb; blocked boolean:=false; begin
  if exists(select 1 from public.clair_budgets) then raise exception 'RLS cross-owner read'; end if;
  update public.clair_budgets set revision=revision+1;
  get diagnostics affected=ROW_COUNT;
  if affected<>0 then raise exception 'RLS cross-owner update'; end if;
  r:=public.save_clair_budget((select payload from advice_fixture),1,gen_random_uuid(),'other');
  if r->>'saved'<>'false' or r->'row'<>'null'::jsonb then raise exception 'Cross-owner CAS'; end if;
  begin
    insert into public.clair_budgets(user_id,payload,revision,operation_id)
      values (auth.uid(),(select payload from advice_fixture)-'adviceSchema',1,gen_random_uuid());
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'Unmarked advice object inserted'; end if;
  blocked:=false;
  begin
    insert into public.clair_budgets(user_id,payload,revision,operation_id)
      values (auth.uid(),jsonb_set((select payload from advice_fixture),'{adviceSchema}','2'),1,gen_random_uuid());
  exception when check_violation then blocked:=true; end;
  if not blocked then raise exception 'Unknown marker inserted'; end if;
  blocked:=false;
  begin
    insert into public.clair_budgets(user_id,payload,revision,operation_id)
      values ('11111111-1111-4111-8111-111111111111',(select payload from advice_fixture),1,gen_random_uuid());
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'RLS cross-owner insert'; end if;
end;$$;
reset role;
set role anon;
do $$declare blocked boolean:=false; begin
  begin perform public.save_clair_budget('{}',0,gen_random_uuid(),'anon'); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Anonymous save access'; end if;
end;$$;
reset role;
do $$begin
  if exists(select 1 from pg_proc where oid='public.clair_guard_advice_schema()'::regprocedure and
    (prosecdef or proconfig is distinct from array['search_path=""'])) then raise exception 'Invoker/search_path regression'; end if;
  if has_function_privilege('anon','public.clair_guard_advice_schema()','EXECUTE')
    or has_function_privilege('authenticated','public.clair_guard_advice_schema()','EXECUTE') then raise exception 'Trigger function exposed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.clair_budgets'::regclass) then raise exception 'RLS disabled'; end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='clair_budgets')<>3 then raise exception 'Policies changed'; end if;
end;$$;
select 'PASS RLS two-owner isolation, CAS/idempotency, anonymous denial, Express/savings/currency guards and invoker/search_path privileges' as result;
