-- Only for the initial Clair installation, before any device has been enabled.
-- No CASCADE: unexpected dependencies must stop the relocation.
do $guard$
begin
  if exists(select 1 from net.http_request_queue) then raise exception 'Pending HTTP requests: relocation aborted'; end if;
  if exists(select 1 from public.clair_push_devices) then raise exception 'Active installation: relocation aborted'; end if;
end;
$guard$;
create schema if not exists extensions;
drop extension pg_net;
create extension pg_net with schema extensions;
