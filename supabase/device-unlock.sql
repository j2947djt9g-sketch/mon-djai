begin;
create table public.clair_device_unlocks(
 id uuid primary key references public.clair_account_help(id) on delete cascade,
 email text not null,
 secret_hash text not null check(secret_hash ~ '^[a-f0-9]{64}$'),
 device_label text not null check(length(device_label) between 1 and 100),
 fingerprint text not null,
 status text not null default 'pending' check(status in ('pending','approving','approved','completed')),
 user_id uuid references auth.users(id) on delete cascade,
 approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours',
 lease_until timestamptz,
 issue_count integer not null default 0
);
create index clair_device_unlock_email on public.clair_device_unlocks(email,created_at desc);
create index clair_device_unlock_fingerprint on public.clair_device_unlocks(fingerprint,created_at desc);
alter table public.clair_device_unlocks enable row level security;
revoke all on public.clair_device_unlocks from public,anon,authenticated;
grant all on public.clair_device_unlocks to service_role;

create function public.clair_request_device_unlock(p_id uuid,p_email text,p_hash text,p_device text,p_fingerprint text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(782631);
 if p_hash !~ '^[a-f0-9]{64}$' or length(p_email)>254 or p_email<>lower(p_email)
  or length(p_device) not between 1 and 100 or p_fingerprint !~ '^[a-f0-9]{64}$' then
  raise exception 'Invalid request' using errcode='22023';
 end if;
 if exists(select 1 from public.clair_device_unlocks where id=p_id and secret_hash=p_hash and email=p_email and expires_at>now()) then return true;end if;
 if (select count(*) from public.clair_device_unlocks where created_at>now()-interval '1 day')>=200
  or (select count(*) from public.clair_device_unlocks where fingerprint=p_fingerprint and created_at>now()-interval '1 hour')>=5
  or (select count(*) from public.clair_device_unlocks where email=p_email and created_at>now()-interval '1 day')>=3 then return false;end if;
 insert into public.clair_account_help(id,email,reason,fingerprint) values(p_id,p_email,'access_problem',p_fingerprint);
 insert into public.clair_device_unlocks(id,email,secret_hash,device_label,fingerprint) values(p_id,p_email,p_hash,p_device,p_fingerprint);
 return true;
end;$$;

create function public.clair_begin_device_unlock(p_id uuid,p_actor uuid,p_target uuid,p_email text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare found_id uuid;
begin
 if not exists(select 1 from public.clair_masterboard_admins where user_id=p_actor) then raise exception 'Admin required' using errcode='42501';end if;
 select id into found_id from public.clair_device_unlocks where id=p_id and email=p_email and expires_at>now()
  and (status='pending' or (status='approving' and updated_at<now()-interval '1 minute')) for update;
 if found_id is null then return false;end if;
 if not public.clair_claim_reset_authorization(p_actor,p_target) then return false;end if;
 update public.clair_device_unlocks set status='approving',user_id=p_target,approved_by=p_actor,updated_at=now() where id=p_id;
 return true;
end;$$;

create function public.clair_claim_device_unlock(p_id uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.clair_device_unlocks;
begin
 select * into item from public.clair_device_unlocks where id=p_id and secret_hash=p_hash for update;
 if not found or item.expires_at<=now() or item.status='completed' then return jsonb_build_object('state','expired');end if;
 if item.status<>'approved' then return jsonb_build_object('state','pending');end if;
 if item.issue_count>=5 then return jsonb_build_object('state','expired');end if;
 if item.lease_until>now() then return jsonb_build_object('state','pending');end if;
 update public.clair_device_unlocks set lease_until=now()+interval '30 seconds',issue_count=issue_count+1 where id=p_id;
 return jsonb_build_object('state','ready','email',item.email,'user_id',item.user_id);
end;$$;

create function public.clair_complete_device_unlock(p_id uuid,p_hash text,p_user uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.clair_device_unlocks set status='completed',secret_hash=repeat('0',64),updated_at=now()
  where id=p_id and secret_hash=p_hash and status='approved' and user_id=p_user and expires_at>now();
 if not found then return false;end if;
 update public.clair_account_help set status='closed',updated_at=now() where id=p_id;
 return true;
end;$$;
revoke all on function public.clair_request_device_unlock(uuid,text,text,text,text),public.clair_begin_device_unlock(uuid,uuid,uuid,text),public.clair_claim_device_unlock(uuid,text),public.clair_complete_device_unlock(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.clair_request_device_unlock(uuid,text,text,text,text),public.clair_begin_device_unlock(uuid,uuid,uuid,text),public.clair_claim_device_unlock(uuid,text),public.clair_complete_device_unlock(uuid,text,uuid) to service_role;
commit;
