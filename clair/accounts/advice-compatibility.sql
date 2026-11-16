-- PREPARED ONLY. Apply before releasing a client that writes adviceSchema:1.
-- Review/test in a disposable database first; no live application is authorized here.
-- Additive to schema.sql + currency/exchange/Express/savings guards (+ exchange-v2).
-- Does not rewrite existing rows, replace save/CAS/RPC, change RLS or grant table access.
begin;
create or replace function public.clair_guard_advice_schema()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  a jsonb; annotations jsonb; reviews jsonb; goals jsonb; place jsonb;
  txs jsonb; tx jsonb; original jsonb; v jsonb; entry jsonb; old_goal jsonb;
  id text; m text; category text; nature text; date_text text;
  amount numeric; total numeric; old_override jsonb; new_override jsonb;
  converted_goals jsonb; converted_month jsonb; converting boolean:=false; refund_id text; refund_context jsonb;
  previous_projection jsonb; next_projection jsonb;
begin
  if new.payload ? 'adviceSchema' and new.payload->'adviceSchema' <> '1'::jsonb then
    raise exception 'clair_advice_upgrade_required' using errcode='23514';
  end if;
  if TG_OP='UPDATE' and old.payload->'adviceSchema'='1'::jsonb
    and new.payload->'adviceSchema' is distinct from '1'::jsonb then
    raise exception 'clair_advice_upgrade_required' using errcode='23514';
  end if;
  if new.payload->'adviceSchema' is distinct from '1'::jsonb then
    if new.payload ? 'advice' then raise exception 'clair_advice_upgrade_required' using errcode='23514'; end if;
    return new; -- Unmarked legacy payloads remain byte-for-byte JSON compatible.
  end if;
  a:=coalesce(new.payload->'advice','{}'::jsonb);
  if jsonb_typeof(a) is distinct from 'object' or a-array['transactions','months','goals','location']<>'{}'::jsonb then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  annotations:=coalesce(a->'transactions','{}'::jsonb);
  reviews:=coalesce(a->'months','{}'::jsonb);
  goals:=coalesce(a->'goals','{}'::jsonb);
  place:=coalesce(a->'location','{}'::jsonb);
  if jsonb_typeof(annotations) is distinct from 'object' or jsonb_typeof(reviews) is distinct from 'object'
    or jsonb_typeof(goals) is distinct from 'object' or jsonb_typeof(place) is distinct from 'object' then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  if (select count(*) from jsonb_object_keys(annotations))>50000
    or (select count(*) from jsonb_object_keys(reviews))>2400
    or (select count(*) from jsonb_object_keys(goals))>2400 then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  if TG_OP='UPDATE' then
    converting:=coalesce(old.payload->'adviceSchema'='1'::jsonb,false) and
      (coalesce(old.payload->>'currency','EUR')<>coalesce(new.payload->>'currency','EUR') or
       coalesce(old.payload->>'currencyRevision','0')<>coalesce(new.payload->>'currencyRevision','0'));
  end if;
  -- Canonical transactions provide the only source for direction/date/refund caps.
  if jsonb_typeof(new.payload->'transactions') is distinct from 'array'
    or jsonb_array_length(new.payload->'transactions')>50000 then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  for tx in select value from jsonb_array_elements(new.payload->'transactions') loop
    id:=tx->>'id'; date_text:=tx->>'date';
    if jsonb_typeof(tx) is distinct from 'object' or jsonb_typeof(tx->'id') is distinct from 'string'
      or id!~'^[a-zA-Z0-9_-]{1,100}$' or id in ('__proto__','constructor','prototype')
      or jsonb_typeof(tx->'type') is distinct from 'string' or tx->>'type' not in ('income','expense')
      or jsonb_typeof(tx->'amountCents') is distinct from 'number'
      or jsonb_typeof(tx->'date') is distinct from 'string' then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    amount:=(tx->>'amountCents')::numeric;
    if amount<>trunc(amount) or amount<0 or amount>10000000000
      or (new.payload->>'currency' in ('XOF','XAF') and mod(amount,100)<>0) then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    if date_text!~'^\d{4}-\d{2}-\d{2}$' or date_text<'2000-01-01' or date_text>'2100-12-31'
      or to_char(date_text::date,'YYYY-MM-DD')<>date_text then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(new.payload->'transactions'))
    <>jsonb_array_length(new.payload->'transactions') then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  select coalesce(jsonb_object_agg(value->>'id',value),'{}'::jsonb) into txs
    from jsonb_array_elements(new.payload->'transactions');
  for id,v in select key,value from jsonb_each(annotations) loop
    tx:=txs->id; nature:=v->>'nature';
    if id!~'^[a-zA-Z0-9_-]{1,100}$' or id in ('__proto__','constructor','prototype') or tx is null
      or jsonb_typeof(v) is distinct from 'object' or v-array['nature','exceptional','refundOf']<>'{}'::jsonb then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    if v ? 'nature' and (jsonb_typeof(v->'nature') is distinct from 'string'
      or nature not in ('income','expense','refund','transfer','adjustment') or tx->>'categoryId'='epargne'
      or (nature in ('income','refund') and tx->>'type'<>'income') or (nature='expense' and tx->>'type'<>'expense')) then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    if v ? 'exceptional' and (jsonb_typeof(v->'exceptional') is distinct from 'boolean'
      or (v->'exceptional'='true'::jsonb and (tx->>'type'<>'expense' or tx->>'categoryId'='epargne'
        or (nature is not null and nature<>'expense')))) then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    if v ? 'refundOf' and (nature is distinct from 'refund' or jsonb_typeof(v->'refundOf') is distinct from 'string'
      or v->>'refundOf'!~'^[a-zA-Z0-9_-]{1,100}$' or v->>'refundOf' in ('__proto__','constructor','prototype')) then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
    if v ? 'refundOf' then
      original:=txs->(v->>'refundOf');
      if original is null or original->>'type'<>'expense' or original->>'categoryId'='epargne'
        or original->>'date'>tx->>'date' or annotations#>>array[v->>'refundOf','nature'] in ('transfer','adjustment') then
        raise exception 'clair_advice_invalid' using errcode='23514';
      end if;
    end if;
  end loop;
  for m,v in select key,value from jsonb_each(reviews) loop
    date_text:=v->>'through';
    if m!~'^\d{4}-\d{2}$' or m<'2000-01' or m>'2100-12'
      or to_char((m||'-01')::date,'YYYY-MM')<>m
      or jsonb_typeof(v) is distinct from 'object' or v-array['through']<>'{}'::jsonb
      or jsonb_typeof(v->'through') is distinct from 'string'
      or date_text!~'^\d{4}-\d{2}-\d{2}$' or left(date_text,7)<>m
      or to_char(date_text::date,'YYYY-MM-DD')<>date_text then
      raise exception 'clair_advice_invalid' using errcode='23514';
    end if;
  end loop;
  -- Conversion rounds each ledger row independently. When split refunds exceed
  -- the rounded cap, preserve amounts and refund nature, unlink the whole group
  -- and invalidate each affected review. Ordinary writes still reject overcaps.
  for id,total in select value->>'refundOf',sum((txs->key->>'amountCents')::numeric)
    from jsonb_each(annotations) where value ? 'refundOf' group by value->>'refundOf' loop
    if total>(txs->id->>'amountCents')::numeric then
      if not converting then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
      reviews:=reviews-left(txs->id->>'date',7);
      for refund_id,refund_context in select key,value from jsonb_each(annotations) where value->>'refundOf'=id loop
        annotations:=jsonb_set(annotations,array[refund_id],refund_context-'refundOf');
        reviews:=reviews-left(txs->refund_id->>'date',7);
      end loop;
      a:=a||jsonb_build_object('transactions',annotations,'months',reviews);
      new.payload:=new.payload||jsonb_build_object('advice',a);
    end if;
  end loop;
  for m,entry in select key,value from jsonb_each(goals) loop
    if m!~'^\d{4}-\d{2}$' or m<'2000-01' or m>'2100-12' or to_char((m||'-01')::date,'YYYY-MM')<>m
      or jsonb_typeof(entry) is distinct from 'object' then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
    if (select count(*) from jsonb_object_keys(entry))>200 then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
    for category,v in select key,value from jsonb_each(entry) loop
      date_text:=v->>'setOn';
      if category!~'^[a-zA-Z0-9_-]{1,100}$' or category in ('__proto__','constructor','prototype','epargne')
        or jsonb_typeof(v) is distinct from 'object' or v-array['amountCents','setOn']<>'{}'::jsonb
        or jsonb_typeof(v->'amountCents') is distinct from 'number'
        or jsonb_typeof(v->'setOn') is distinct from 'string' then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
      amount:=(v->>'amountCents')::numeric;
      if amount<>trunc(amount) or amount<=0 or amount>10000000000
        or ((case when converting then old.payload->>'currency' else new.payload->>'currency' end) in ('XOF','XAF') and mod(amount,100)<>0)
        or date_text!~'^\d{4}-\d{2}-\d{2}$' or date_text<'2000-01-01' or date_text>'2100-12-31'
        or to_char(date_text::date,'YYYY-MM-DD')<>date_text then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
    end loop;
  end loop;
  if place-array['country','city']<>'{}'::jsonb
    or (place ? 'country' and (jsonb_typeof(place->'country') is distinct from 'string'
      or (place->>'country'<>'' and place->>'country'!~'^[A-Z]{2}$')))
    or (place ? 'city' and (jsonb_typeof(place->'city') is distinct from 'string'
      or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0)
        from regexp_split_to_table(place->>'city','') c)>100)) then
    raise exception 'clair_advice_invalid' using errcode='23514';
  end if;
  -- FX RPCs already convert the canonical overrides. Reuse their result, never
  -- duplicate rate/rounding logic. Stale evidence is removed, including CFA cents.
  if converting then
    converted_goals:='{}';
    for m,entry in select key,value from jsonb_each(goals) loop
      if jsonb_typeof(entry) is distinct from 'object' then raise exception 'clair_advice_invalid' using errcode='23514'; end if;
      converted_month:='{}';
      for category,v in select key,value from jsonb_each(entry) loop
        old_goal:=old.payload#>array['advice','goals',m,category];
        old_override:=old.payload#>array['budgetOverrides',m,category];
        new_override:=new.payload#>array['budgetOverrides',m,category];
        if jsonb_typeof(old_override)='number' and jsonb_typeof(new_override)='number'
          and old_goal=v and (old_goal->>'amountCents')::numeric=(old_override#>>'{}')::numeric*100 then
          amount:=(new_override#>>'{}')::numeric*100;
          if amount<>trunc(amount) or amount<=0 or amount>10000000000
            or (new.payload->>'currency' in ('XOF','XAF') and mod(amount,100)<>0) then
            raise exception 'clair_advice_invalid' using errcode='23514';
          end if;
          converted_month:=converted_month||jsonb_build_object(category,v||jsonb_build_object('amountCents',amount));
        end if;
      end loop;
      converted_goals:=converted_goals||jsonb_build_object(m,converted_month);
    end loop;
    goals:=converted_goals;
    a:=a||jsonb_build_object('goals',goals);
    new.payload:=new.payload||jsonb_build_object('advice',a);
  end if;
  -- Match engine.reconcileAdviceContext's monthly financial projection. A
  -- review command alone, row reordering and exceptional flags preserve reviews.
  -- FX keeps the calendar coverage; split-refund unlinking above is the exception.
  if TG_OP='UPDATE' and not converting and reviews<>'{}'::jsonb then
    select coalesce(jsonb_object_agg(month_key,rows),'{}'::jsonb) into previous_projection from (
      select left(t->>'date',7) as month_key,jsonb_agg(jsonb_build_array(
        t->>'id',t->>'type',t->'amountCents',t->>'date',t->>'categoryId',nullif(t->>'savingsProjectId',''),
        nullif(old.payload#>>array['advice','transactions',t->>'id','nature'],''),
        nullif(old.payload#>>array['advice','transactions',t->>'id','refundOf'],'')) order by t->>'id') as rows
      from jsonb_array_elements(old.payload->'transactions') t group by left(t->>'date',7)
    ) grouped;
    select coalesce(jsonb_object_agg(month_key,rows),'{}'::jsonb) into next_projection from (
      select left(t->>'date',7) as month_key,jsonb_agg(jsonb_build_array(
        t->>'id',t->>'type',t->'amountCents',t->>'date',t->>'categoryId',nullif(t->>'savingsProjectId',''),
        nullif(annotations#>>array[t->>'id','nature'],''),nullif(annotations#>>array[t->>'id','refundOf'],'')) order by t->>'id') as rows
      from jsonb_array_elements(new.payload->'transactions') t group by left(t->>'date',7)
    ) grouped;
    for m in select jsonb_object_keys(reviews) loop
      if previous_projection->m is distinct from next_projection->m then reviews:=reviews-m; end if;
    end loop;
    if reviews is distinct from a->'months' then
      a:=a||jsonb_build_object('months',reviews);
      new.payload:=new.payload||jsonb_build_object('advice',a);
    end if;
  end if;
  return new;
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation or numeric_value_out_of_range then
  raise exception 'clair_advice_invalid' using errcode='23514';
end;$$;
revoke all on function public.clair_guard_advice_schema() from public,anon,authenticated;
drop trigger if exists clair_guard_advice_schema on public.clair_budgets;
create trigger clair_guard_advice_schema before insert or update of payload on public.clair_budgets
for each row execute function public.clair_guard_advice_schema();
commit;
