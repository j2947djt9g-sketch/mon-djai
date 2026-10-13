-- Run AFTER schema.sql on the dedicated Clair project. Fixtures are rolled back.
begin;
select set_config('clair.test_a',gen_random_uuid()::text,true),set_config('clair.test_b',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('clair.test_a')::uuid),(current_setting('clair.test_b')::uuid);
select set_config('request.jwt.claim.sub',current_setting('clair.test_a'),true);
set local role authenticated;
do $$
declare result jsonb; first_op uuid := gen_random_uuid();
begin
  result := public.save_clair_budget('{"version":3,"openingCents":1700,"transactions":[],"rules":[],"preferences":{}}',0,first_op,'Clair test');
  if not (result->>'saved')::boolean or (result->'row'->>'revision')::bigint <> 1 then raise exception 'Initial save failed'; end if;
  result := public.save_clair_budget('{"version":3,"openingCents":1700,"transactions":[],"rules":[],"preferences":{}}',0,first_op,'Clair test');
  if not (result->>'saved')::boolean or (result->'row'->>'revision')::bigint <> 1 then raise exception 'Idempotency failed'; end if;
  result := public.save_clair_budget('{"version":3,"openingCents":1900,"transactions":[],"rules":[],"preferences":{}}',0,gen_random_uuid(),'Clair test');
  if (result->>'saved')::boolean then raise exception 'Stale revision overwrote data'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('clair.test_b'),true);
set local role authenticated;
do $$
declare modified integer;
begin
  if exists(select 1 from public.clair_budgets) then raise exception 'Account B can read account A'; end if;
  update public.clair_budgets set display_name='unexpected';
  get diagnostics modified = row_count;
  if modified > 0 then raise exception 'Account B can update account A'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('clair.test_a'),true);
set local role authenticated;
do $$
begin
  begin
    update public.clair_budgets set user_id=current_setting('clair.test_b')::uuid;
    raise exception 'Ownership reassignment succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform * from public.clair_budgets;
    raise exception 'Anonymous read succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
