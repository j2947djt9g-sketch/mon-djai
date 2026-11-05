-- PREPARED ONLY: review and validate in a disposable PostgreSQL instance before applying.
-- Apply after exchange.sql. No existing rows, RLS, grants or conversion rates change.
-- The native GBP guard preserves the atomic conversion operation capability.
begin;
create or replace function public.clair_guard_currency() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if coalesce(new.payload->>'currency','EUR') not in ('EUR','USD','GBP','XOF','XAF') then raise exception 'Unsupported Clair currency' using errcode='22023';end if;
  if TG_OP='UPDATE' and old.payload->>'initialized'='true' and new.payload->>'initialized'='true' and
    (coalesce(old.payload->>'currency','EUR')<>coalesce(new.payload->>'currency','EUR') or coalesce(old.payload->>'currencyRevision','0')<>coalesce(new.payload->>'currencyRevision','0'))
    and coalesce(current_setting('clair.currency_operation',true),'')<>new.operation_id::text then
    raise exception 'Utilise le changement de devise dans une version à jour de Clair.' using errcode='22023';
  end if;
  return new;
end;$$;
revoke all on function public.clair_guard_currency() from public,anon,authenticated;

create or replace function public.clair_guard_express_schema()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.payload ? 'expressSchema' and new.payload->'expressSchema' <> '1'::jsonb then
    raise exception 'clair_express_upgrade_required' using errcode='23514';
  end if;
  if TG_OP='UPDATE' and old.payload->'expressSchema'='1'::jsonb then
    if new.payload->'expressSchema' is distinct from '1'::jsonb then
      raise exception 'clair_express_upgrade_required' using errcode='23514';
    end if;
    -- Explicit deletion is allowed. Provenance on a retained transaction is immutable.
    if exists (
      select 1 from jsonb_array_elements(old.payload->'transactions') o
      join jsonb_array_elements(new.payload->'transactions') n on n->>'id'=o->>'id'
      where o ? 'express' and n->'express' is distinct from o->'express'
    ) then
      raise exception 'clair_express_provenance_required' using errcode='23514';
    end if;
  end if;
  return new;
end;$$;
revoke all on function public.clair_guard_express_schema() from public,anon,authenticated;
drop trigger if exists clair_guard_express_schema on public.clair_budgets;
create trigger clair_guard_express_schema before insert or update of payload on public.clair_budgets
for each row execute function public.clair_guard_express_schema();
commit;
