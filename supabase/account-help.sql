-- Private support inbox; public browsers only use the rate-limited submission endpoint.
begin;
create table public.clair_account_help (
 id uuid primary key default gen_random_uuid(),
 email text not null check(length(email) between 3 and 254 and email=lower(email)),
 reason text not null check(reason in ('email_missing','link_expired','access_problem')),
 status text not null default 'pending' check(status in ('pending','authorized','closed')),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index clair_account_help_email_date on public.clair_account_help(email,created_at desc);
create index clair_account_help_fingerprint_date on public.clair_account_help(fingerprint,created_at desc);
create index clair_account_help_date on public.clair_account_help(created_at desc);
alter table public.clair_account_help enable row level security;
revoke all on public.clair_account_help from public,anon,authenticated;
grant all on public.clair_account_help to service_role;
create function public.clair_request_account_help(p_email text,p_reason text,p_fingerprint text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('clair-account-help',0));
 if p_email is null or p_email<>lower(p_email) or length(p_email)>254
  or p_reason is null or p_reason not in ('email_missing','link_expired','access_problem')
  or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
  raise exception 'Invalid request' using errcode='22023';
 end if;
 if (select count(*) from public.clair_account_help where created_at>now()-interval '1 day')>=200 then return false;end if;
 if (select count(*) from public.clair_account_help where fingerprint=p_fingerprint and created_at>now()-interval '1 hour')>=5 then return false;end if;
 if exists(select 1 from public.clair_account_help where email=p_email and status='pending' and created_at>now()-interval '1 day') then return true;end if;
 if (select count(*) from public.clair_account_help where email=p_email and created_at>now()-interval '1 day')>=2 then return false;end if;
 insert into public.clair_account_help(email,reason,fingerprint) values(p_email,p_reason,p_fingerprint);
 return true;
end;
$$;
revoke all on function public.clair_request_account_help(text,text,text) from public,anon,authenticated;
grant execute on function public.clair_request_account_help(text,text,text) to service_role;
commit;
