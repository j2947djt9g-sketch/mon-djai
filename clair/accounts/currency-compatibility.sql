-- Prevent older clients from stripping the currency of an initialized budget.
-- No credentials or user data. Apply before enabling multicurrency publicly.
begin;
create or replace function public.clair_guard_currency() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(new.payload->>'currency','EUR') not in ('EUR','USD','XOF','XAF') then
    raise exception 'Unsupported Clair currency' using errcode='22023';
  end if;
  if TG_OP='UPDATE' and old.payload->>'initialized'='true'
     and new.payload->>'initialized'='true'
     and coalesce(old.payload->>'currency','EUR')<>coalesce(new.payload->>'currency','EUR') then
    raise exception 'Budget currency cannot change. Update Clair and reload the online budget.' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function public.clair_guard_currency() from public,anon,authenticated;
drop trigger if exists clair_guard_currency on public.clair_budgets;
create trigger clair_guard_currency before insert or update on public.clair_budgets
for each row execute function public.clair_guard_currency();
commit;
