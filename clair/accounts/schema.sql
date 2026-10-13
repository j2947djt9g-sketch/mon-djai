-- Apply to the Clair project. No credentials are stored in this file.
begin;
create table if not exists public.clair_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null check (revision > 0),
  operation_id uuid not null,
  display_name text not null default '' check (length(display_name) <= 64),
  updated_at timestamptz not null default now(),
  constraint clair_payload_shape check (
    jsonb_typeof(payload) = 'object' and payload ?& array['version','transactions','rules','preferences'] and payload->>'version' = '3'
    and jsonb_typeof(payload->'transactions') = 'array'
    and jsonb_typeof(payload->'rules') = 'array'
    and jsonb_typeof(payload->'preferences') = 'object'
    and octet_length(payload::text) <= 8388608
  )
);
alter table public.clair_budgets enable row level security;
revoke all on public.clair_budgets from public, anon;
grant select, insert, update on public.clair_budgets to authenticated;
create policy clair_select_own on public.clair_budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy clair_insert_own on public.clair_budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy clair_update_own on public.clair_budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_clair_budget(
  p_payload jsonb, p_expected_revision bigint, p_operation_id uuid, p_display_name text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_row public.clair_budgets%rowtype;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_operation_id is null or p_display_name is null then
    raise exception 'Invalid save parameters' using errcode = '22023';
  end if;
  select * into current_row from public.clair_budgets where user_id = owner_id for update;
  if not found then
    if p_expected_revision <> 0 then return jsonb_build_object('saved',false,'row',null); end if;
    insert into public.clair_budgets(user_id,payload,revision,operation_id,display_name)
      values (owner_id,p_payload,1,p_operation_id,p_display_name)
      on conflict (user_id) do nothing returning * into current_row;
    if found then return jsonb_build_object('saved',true,'row',to_jsonb(current_row)); end if;
    select * into current_row from public.clair_budgets where user_id = owner_id for update;
  end if;
  if current_row.operation_id = p_operation_id then
    return jsonb_build_object('saved',true,'row',to_jsonb(current_row));
  end if;
  if current_row.revision <> p_expected_revision then
    return jsonb_build_object('saved',false,'row',to_jsonb(current_row));
  end if;
  update public.clair_budgets set payload=p_payload,revision=revision+1,operation_id=p_operation_id,
    display_name=p_display_name,updated_at=now() where user_id=owner_id returning * into current_row;
  return jsonb_build_object('saved',true,'row',to_jsonb(current_row));
end;
$$;
revoke all on function public.save_clair_budget(jsonb,bigint,uuid,text) from public, anon;
grant execute on function public.save_clair_budget(jsonb,bigint,uuid,text) to authenticated;
commit;
