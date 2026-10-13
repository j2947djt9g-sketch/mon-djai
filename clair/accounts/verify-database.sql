-- Run AFTER schema.sql on the dedicated Clair project. Fixtures are rolled back.
begin;
create temporary table clair_test_ids(a uuid,b uuid);
insert into clair_test_ids values(gen_random_uuid(),gen_random_uuid());
grant select on clair_test_ids to authenticated;
insert into auth.users(id) select a from clair_test_ids union all select b from clair_test_ids;
select set_config('request.jwt.claim.sub',(select a::text from clair_test_ids),true);
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
select set_config('request.jwt.claim.sub',(select b::text from clair_test_ids),true);
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
select set_config('request.jwt.claim.sub',(select a::text from clair_test_ids),true);
set local role authenticated;
do $$
begin
  begin
    update public.clair_budgets set user_id=(select b from pg_temp.clair_test_ids);
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
