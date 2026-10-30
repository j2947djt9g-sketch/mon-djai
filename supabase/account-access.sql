-- Only the authenticated caller's current access state is exposed.
begin;
create or replace function public.clair_account_active() returns boolean
language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and (select clair_private.account_active());
$$;
revoke all on function public.clair_account_active() from public,anon;
grant execute on function public.clair_account_active() to authenticated;
commit;
