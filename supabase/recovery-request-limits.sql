-- Recovery request quotas; only salted hashes are retained, never addresses or passwords.
begin;
create schema if not exists clair_private;
revoke all on schema clair_private from public,anon,authenticated;
grant usage on schema clair_private to service_role;
create table clair_private.recovery_request_limits(
 key text primary key check(key ~ '^(email|ip):[a-f0-9]{64}$'),
 window_started_at timestamptz not null default now(),
 requests integer not null default 0 check(requests between 0 and 20),
 next_allowed_at timestamptz not null default now(),
 blocked_until timestamptz not null default now()
);
alter table clair_private.recovery_request_limits enable row level security;
revoke all on clair_private.recovery_request_limits from public,anon,authenticated;
grant select,insert,update,delete on clair_private.recovery_request_limits to service_role;
create function public.clair_claim_recovery_request(p_recipient text,p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_now timestamptz:=statement_timestamp();v_key text;v_wait integer;v_count integer;v_blocked boolean;
 v_keys text[]:=array['email:'||p_recipient,'ip:'||p_fingerprint];
begin
 if p_recipient is null or p_recipient !~ '^[a-f0-9]{64}$' or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
  raise exception 'Invalid fingerprint' using errcode='22023';
 end if;
 for v_key in select unnest(v_keys) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(v_key,41));
 end loop;
 insert into clair_private.recovery_request_limits(key,window_started_at,next_allowed_at,blocked_until)
 select k,v_now,v_now,v_now from unnest(v_keys) k on conflict(key) do nothing;
 update clair_private.recovery_request_limits set window_started_at=v_now,requests=0,next_allowed_at=v_now,blocked_until=v_now
 where key=any(v_keys) and window_started_at<=v_now-interval '30 minutes' and blocked_until<=v_now;
 select greatest(0,ceil(extract(epoch from max(greatest(next_allowed_at,blocked_until))-v_now))::integer),
 max(requests) filter(where key='email:'||p_recipient),bool_or(blocked_until>v_now)
 into v_wait,v_count,v_blocked from clair_private.recovery_request_limits where key=any(v_keys);
 if v_wait>0 then return jsonb_build_object('allowed',false,'retry_after',v_wait,'remaining_requests',greatest(0,5-v_count),'code',case when v_blocked then 'recovery_limit' else 'recovery_wait' end);end if;
 update clair_private.recovery_request_limits set requests=requests+1,
 next_allowed_at=v_now+case when requests+1>=case when key like 'email:%' then 5 else 20 end then interval '30 minutes' when key like 'email:%' then interval '1 minute' else interval '0 seconds' end,
 blocked_until=case when requests+1>=case when key like 'email:%' then 5 else 20 end then v_now+interval '30 minutes' else v_now end
 where key=any(v_keys);
 select requests into v_count from clair_private.recovery_request_limits where key='email:'||p_recipient;
 select bool_or(blocked_until>v_now) into v_blocked from clair_private.recovery_request_limits where key=any(v_keys);
 delete from clair_private.recovery_request_limits where window_started_at<v_now-interval '2 days' and blocked_until<v_now;
 return jsonb_build_object('allowed',true,'retry_after',case when v_blocked then 1800 else 60 end,'remaining_requests',greatest(0,5-v_count));
end;
$$;
revoke all on function public.clair_claim_recovery_request(text,text) from public,anon,authenticated;
grant execute on function public.clair_claim_recovery_request(text,text) to service_role;
commit;
