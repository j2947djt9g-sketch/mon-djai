-- Preserve named savings when an older open Clair tab tries to save an obsolete payload.
-- Existing budgets are not rewritten. Ownership policies and financial amounts are unchanged.
begin;
create or replace function public.clair_guard_savings_schema()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.payload->>'savingsSchema' = '1' and (
    new.payload->>'savingsSchema' is distinct from '1'
    or jsonb_typeof(new.payload->'savingsProjects') is distinct from 'array'
  ) then
    raise exception 'clair_savings_upgrade_required' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.clair_guard_savings_schema() from public, anon, authenticated;
drop trigger if exists clair_guard_savings_schema on public.clair_budgets;
create trigger clair_guard_savings_schema before update of payload on public.clair_budgets
for each row execute function public.clair_guard_savings_schema();
commit;
