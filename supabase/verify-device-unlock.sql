begin;
do $$
declare uid uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); result jsonb;
begin
 insert into auth.users(id) values(uid);
 if not public.clair_request_device_unlock(rid,'device@example.invalid',repeat('a',64),'iPhone',repeat('f',64)) then raise exception 'Request rejected';end if;
 result:=public.clair_claim_device_unlock(rid,repeat('b',64));
 if result->>'state'<>'expired' then raise exception 'Wrong device accepted';end if;
 result:=public.clair_claim_device_unlock(rid,repeat('a',64));
 if result->>'state'<>'pending' then raise exception 'Pending request issued';end if;
 update public.clair_device_unlocks set status='approved',user_id=uid where id=rid;
 result:=public.clair_claim_device_unlock(rid,repeat('a',64));
 if result->>'state'<>'ready' or result->>'user_id'<>uid::text then raise exception 'Wrong approved account';end if;
 result:=public.clair_claim_device_unlock(rid,repeat('a',64));
 if result->>'state'<>'expired' then raise exception 'Capability replay';end if;
 if public.clair_complete_device_unlock(rid,repeat('a',64),other) then raise exception 'Wrong user completed';end if;
 if not public.clair_complete_device_unlock(rid,repeat('a',64),uid) then raise exception 'Completion failed';end if;
 if has_table_privilege('anon','public.clair_device_unlocks','select') or has_table_privilege('authenticated','public.clair_device_unlocks','select') then raise exception 'Private capability table exposed';end if;
 if has_function_privilege('anon','public.clair_claim_device_unlock(uuid,text)','execute') or has_function_privilege('authenticated','public.clair_request_device_unlock(uuid,text,text,text,text)','execute') then raise exception 'Service RPC exposed';end if;
end;$$;
rollback;
