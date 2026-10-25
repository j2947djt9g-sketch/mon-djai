-- Isolated quota tests, rolled back even when run against the project.
begin;
do $$ begin
 if has_function_privilege('anon','public.clair_claim_recovery_request(text,text)','execute') or has_function_privilege('authenticated','public.clair_claim_recovery_request(text,text)','execute') then raise exception 'Public recovery quota access';end if;
 if has_schema_privilege('anon','clair_private','usage') or has_table_privilege('authenticated','clair_private.recovery_request_limits','select') then raise exception 'Private limits exposed';end if;
end $$;
set local role service_role;
do $$
declare
 r jsonb;recipient text:=md5('clair-quota-test-recipient')||md5('clair-quota-test-recipient-2');
 address text:=md5('clair-quota-test-address')||md5('clair-quota-test-address-2');
 second_address text:=md5('clair-quota-test-other-ip')||md5('clair-quota-test-other-ip-2');
 network text:=md5('clair-quota-test-network')||md5('clair-quota-test-network-2');
 i integer;k text;
begin
 for i in 1..5 loop
  r:=public.clair_claim_recovery_request(recipient,address);
  if not (r->>'allowed')::boolean then raise exception 'Request % should be allowed: %',i,r;end if;
  if i=1 then
   r:=public.clair_claim_recovery_request(recipient,address);
   if (r->>'allowed')::boolean or r->>'code'<>'recovery_wait' then raise exception 'Immediate resend not blocked';end if;
  end if;
  if i<5 then update clair_private.recovery_request_limits set next_allowed_at=now()-interval '1 second' where key in ('email:'||recipient,'ip:'||address);
  elsif (r->>'retry_after')::integer<>1800 then raise exception 'Fifth request must start thirty-minute pause';end if;
 end loop;
 r:=public.clair_claim_recovery_request(recipient,address);
 if (r->>'allowed')::boolean or r->>'code'<>'recovery_limit' then raise exception 'Sixth request allowed';end if;
 r:=public.clair_claim_recovery_request(recipient,second_address);
 if (r->>'allowed')::boolean then raise exception 'Changing device bypassed address quota';end if;
 update clair_private.recovery_request_limits set window_started_at=now()-interval '31 minutes',blocked_until=now()-interval '1 second',next_allowed_at=now()-interval '1 second' where key in ('email:'||recipient,'ip:'||address);
 r:=public.clair_claim_recovery_request(recipient,address);if not (r->>'allowed')::boolean or (r->>'remaining_requests')::integer<>4 then raise exception 'Expired quota did not reset';end if;
 for i in 1..20 loop
  k:=md5('clair-quota-shared-ip-'||i)||md5('clair-quota-shared-ip-2-'||i);
  r:=public.clair_claim_recovery_request(k,network);if not (r->>'allowed')::boolean then raise exception 'Network quota too restrictive at %',i;end if;
 end loop;
 k:=md5('clair-quota-shared-ip-extra')||md5('clair-quota-shared-ip-extra-2');
 r:=public.clair_claim_recovery_request(k,network);if (r->>'allowed')::boolean then raise exception 'Network abuse quota missing';end if;
 raise notice 'PASS recovery SQL: five requests, minute pause, thirty-minute lock, cross-device address quota, expiry, network quota and private permissions';
end $$;
rollback;
