-- Internal administrative records. No browser role can read or write these tables.
begin;
create table public.clair_masterboard_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.clair_masterboard_settings (
  id boolean primary key default true check(id),
  mode text not null default 'free' check(mode = 'free'),
  monthly_cents integer not null default 199 check(monthly_cents = 199),
  payment_phone text not null default '' check(length(payment_phone) <= 40)
);
insert into public.clair_masterboard_settings(id) values(true);
create table public.clair_masterboard_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  test_until date not null,
  updated_at timestamptz not null default now()
);
create table public.clair_masterboard_mail (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  body text not null,
  kind text not null check(kind in ('reminder','recovery')),
  state text not null default 'prepared' check(state in ('prepared','opened','confirmed_sent')),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  confirmed_at timestamptz
);
create index clair_masterboard_mail_user_date on public.clair_masterboard_mail(user_id,created_at desc);
create index clair_masterboard_mail_actor on public.clair_masterboard_mail(actor_id);
create table public.clair_masterboard_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);
create index clair_masterboard_audit_actor on public.clair_masterboard_audit(actor_id);
create index clair_masterboard_audit_target on public.clair_masterboard_audit(target_id);
alter table public.clair_masterboard_admins enable row level security;
alter table public.clair_masterboard_settings enable row level security;
alter table public.clair_masterboard_subscriptions enable row level security;
alter table public.clair_masterboard_mail enable row level security;
alter table public.clair_masterboard_audit enable row level security;
revoke all on public.clair_masterboard_admins, public.clair_masterboard_settings,
  public.clair_masterboard_subscriptions, public.clair_masterboard_mail, public.clair_masterboard_audit from public,anon,authenticated;
grant all on public.clair_masterboard_admins, public.clair_masterboard_settings,
  public.clair_masterboard_subscriptions, public.clair_masterboard_mail, public.clair_masterboard_audit to service_role;
grant usage,select on sequence public.clair_masterboard_audit_id_seq to service_role;

-- Restrictive policies also stop an already-issued JWT after a manual suspension.
create schema if not exists clair_private;
revoke all on schema clair_private from public,anon;
grant usage on schema clair_private to authenticated;
create function clair_private.account_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id = (select auth.uid())
    and (u.banned_until is null or u.banned_until <= now()));
$$;
revoke all on function clair_private.account_active() from public,anon;
grant execute on function clair_private.account_active() to authenticated;
create policy clair_active_account on public.clair_budgets as restrictive for all to authenticated
  using ((select clair_private.account_active())) with check ((select clair_private.account_active()));

-- A service-only transaction preserves concurrent renewals and their audit event.
create function public.clair_masterboard_renew(p_actor uuid,p_target uuid,p_today date)
returns date language plpgsql security invoker set search_path = '' as $$
declare result date;
begin
  if not exists(select 1 from public.clair_masterboard_admins where user_id=p_actor) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  insert into public.clair_masterboard_subscriptions(user_id,test_until)
    values(p_target,(p_today + interval '1 month')::date)
    on conflict(user_id) do update set
      test_until=(greatest(clair_masterboard_subscriptions.test_until,p_today)+interval '1 month')::date,updated_at=now()
    returning test_until into result;
  insert into public.clair_masterboard_audit(actor_id,target_id,action) values(p_actor,p_target,'test_month_added');
  return result;
end;
$$;
revoke all on function public.clair_masterboard_renew(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.clair_masterboard_renew(uuid,uuid,date) to service_role;
commit;
