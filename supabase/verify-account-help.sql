begin;
set local role service_role;
do $$ declare n integer;ok boolean;begin
 ok:=public.clair_request_account_help('fixture@example.invalid','email_missing',repeat('a',64));if not ok then raise exception 'Submission rejected';end if;
 ok:=public.clair_request_account_help('fixture@example.invalid','email_missing',repeat('a',64));if not ok then raise exception 'Deduplication rejected';end if;
 select count(*) into n from public.clair_account_help where email='fixture@example.invalid';if n<>1 then raise exception 'Duplicate requests';end if;
 for i in 1..4 loop perform public.clair_request_account_help('other'||i||'@example.invalid','link_expired',repeat('a',64));end loop;
 if public.clair_request_account_help('sixth@example.invalid','email_missing',repeat('a',64)) then raise exception 'IP request limit bypassed';end if;
 if not public.clair_request_account_help('unknown@example.invalid','access_problem',repeat('b',64)) then raise exception 'Unknown email treated differently';end if;
end;$$;
reset role;
set local role anon;
do $$ declare denied boolean:=false;begin
 begin perform * from public.clair_account_help;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous inbox read';end if;
 denied:=false;begin perform public.clair_request_account_help('a@example.invalid','email_missing',repeat('c',64));exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous RPC bypass';end if;
end;$$;
reset role;
set local role authenticated;
do $$ declare denied boolean:=false;begin
 begin update public.clair_account_help set status='authorized';exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'User self-authorized recovery';end if;
end;$$;
reset role;
rollback;
select 'PASS private help inbox, deduplication, limits, unknown emails and denial of anonymous reads, direct RPC and self-authorization' as result;
