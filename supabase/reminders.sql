-- Additive deployment: no existing budget or account is modified.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table public.clair_push_config(
  id boolean primary key default true check(id),
  public_key text,
  private_key text,
  cron_secret text not null default (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''))
);
insert into public.clair_push_config(id) values(true);
create table public.clair_push_devices(
  device_id text primary key check(device_id ~ '^[a-f0-9]{32}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null check(jsonb_typeof(subscription)='object'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index clair_push_devices_owner on public.clair_push_devices(user_id);
create table public.clair_push_deliveries(
  device_id text not null references public.clair_push_devices(device_id) on delete cascade,
  occurrence_key text not null,
  claim_id uuid not null,
  lease_until timestamptz not null,
  attempts integer not null default 1,
  sent_at timestamptz,
  primary key(device_id,occurrence_key)
);
alter table public.clair_push_config enable row level security;
alter table public.clair_push_devices enable row level security;
alter table public.clair_push_deliveries enable row level security;
revoke all on public.clair_push_config,public.clair_push_devices,public.clair_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.clair_push_config,public.clair_push_devices,public.clair_push_deliveries to service_role;
create function public.clair_claim_push(p_device_id text,p_occurrence_key text,p_claim_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed boolean;
begin
  insert into public.clair_push_deliveries(device_id,occurrence_key,claim_id,lease_until)
  values(p_device_id,p_occurrence_key,p_claim_id,now()+interval '3 minutes')
  on conflict(device_id,occurrence_key) do update
    set claim_id=excluded.claim_id,lease_until=excluded.lease_until,attempts=public.clair_push_deliveries.attempts+1
    where public.clair_push_deliveries.sent_at is null
      and public.clair_push_deliveries.lease_until<now()
      and public.clair_push_deliveries.attempts<3
  returning true into claimed;
  return coalesce(claimed,false);
end;
$$;
revoke all on function public.clair_claim_push(text,text,uuid) from public,anon,authenticated;
grant execute on function public.clair_claim_push(text,text,uuid) to service_role;
-- UTC cron; checking the Paris hour follows daylight saving changes.
select cron.schedule('clair-reminders-j2','*/5 * * * *',$job$
  select net.http_post(
    url:='https://hkssnbvktfscizojhftl.supabase.co/functions/v1/clair-reminders/dispatch',
    headers:=jsonb_build_object('content-type','application/json','x-clair-cron-secret',
      (select cron_secret from public.clair_push_config where id)),
    body:='{}'::jsonb,timeout_milliseconds:=150000
  ) where extract(hour from now() at time zone 'Europe/Paris')=9;
$job$);
select cron.schedule('clair-reminders-cleanup','35 3 * * *',$job$
  delete from public.clair_push_deliveries where lease_until<now()-interval '90 days';
$job$);
