-- Additive source, prepared/tested locally only. Requires separate DB rollout authorization.
-- Apply once AFTER device-unlock.sql; never reapply the historical table creation in production.
begin;
alter table public.clair_device_unlocks
 add column issue_phase text check(issue_phase in ('reserved','dispatched')),
 add column attempt_id uuid,
 add column retry_after timestamptz;
-- Name and definition verified against the historical schema and local pg_constraint catalog.
alter table public.clair_device_unlocks drop constraint clair_device_unlocks_status_check;
alter table public.clair_device_unlocks add constraint clair_device_unlocks_status_check
 check(status in ('pending','approving','approved','issued','completed','issuing','unknown'));
alter table public.clair_device_unlocks add constraint clair_device_unlocks_issuance_check
 check((status='issuing' and issue_phase is not null and attempt_id is not null and lease_until is not null)
    or (status<>'issuing' and issue_phase is null));

create function public.clair_reserve_device_unlock_v2(p_id uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.clair_device_unlocks; instant timestamptz; attempt uuid;
begin
 select * into item from public.clair_device_unlocks where id=p_id and secret_hash=p_hash for update;
 instant:=clock_timestamp(); -- Deliberately after the lock, never transaction-start now().
 if not found or item.expires_at<=instant or item.status in ('issued','unknown','completed') then return jsonb_build_object('state','expired');end if;
 if item.status in ('pending','approving') then return jsonb_build_object('state','pending');end if;
 if item.status='issuing' then
  if item.lease_until>instant then return jsonb_build_object('state','pending');end if;
  if item.issue_phase='dispatched' then
   update public.clair_device_unlocks set status='unknown',issue_phase=null,lease_until=null,retry_after=null,updated_at=instant where id=p_id;
   return jsonb_build_object('state','expired');
  end if;
 end if;
 if item.user_id is null or item.issue_count>=5 then return jsonb_build_object('state','expired');end if;
 if item.retry_after>instant then return jsonb_build_object('state','pending');end if;
 attempt:=gen_random_uuid();
 update public.clair_device_unlocks set status='issuing',issue_phase='reserved',attempt_id=attempt,
  issue_count=issue_count+1,lease_until=instant+interval '30 seconds',retry_after=null,updated_at=instant where id=p_id;
 return jsonb_build_object('state','reserved','attempt_id',attempt,'user_id',item.user_id,'email',item.email,'lease_until',instant+interval '30 seconds');
end;$$;

create function public.clair_dispatch_device_unlock_v2(p_id uuid,p_hash text,p_attempt uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare item public.clair_device_unlocks; instant timestamptz;
begin
 select * into item from public.clair_device_unlocks where id=p_id and secret_hash=p_hash for update;
 instant:=clock_timestamp();
 if not found or p_attempt is null or item.attempt_id is distinct from p_attempt or item.status<>'issuing'
  or item.issue_phase<>'reserved' or item.lease_until<=instant or item.expires_at<=instant then return false;end if;
 update public.clair_device_unlocks set issue_phase='dispatched',lease_until=instant+interval '30 seconds',updated_at=instant where id=p_id;
 return true;
end;$$;

create function public.clair_finish_device_unlock_v2(p_id uuid,p_hash text,p_attempt uuid,p_outcome text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare item public.clair_device_unlocks; instant timestamptz;
begin
 if p_outcome is null or p_outcome not in ('issued','not_issued','unknown') then return false;end if;
 select * into item from public.clair_device_unlocks where id=p_id and secret_hash=p_hash for update;
 instant:=clock_timestamp();
 if not found or p_attempt is null or item.attempt_id is distinct from p_attempt or item.status<>'issuing'
  or item.issue_phase<>'dispatched' or item.lease_until<=instant or item.expires_at<=instant then return false;end if;
 update public.clair_device_unlocks set
  status=case when p_outcome='not_issued' then 'approved' else p_outcome end,
  attempt_id=case when p_outcome='not_issued' then null else attempt_id end,
  issue_phase=null,lease_until=null,
  retry_after=case when p_outcome='not_issued' then instant+interval '5 seconds' else null end,
  updated_at=instant where id=p_id;
 return true;
end;$$;
revoke all on function public.clair_reserve_device_unlock_v2(uuid,text),public.clair_dispatch_device_unlock_v2(uuid,text,uuid),public.clair_finish_device_unlock_v2(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.clair_reserve_device_unlock_v2(uuid,text),public.clair_dispatch_device_unlock_v2(uuid,text,uuid),public.clair_finish_device_unlock_v2(uuid,text,uuid,text) to service_role;
commit;
