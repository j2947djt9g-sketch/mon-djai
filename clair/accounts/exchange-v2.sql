-- Additive frozen InforEuro November 2026 accounting reference.
-- Leaves legacy helpers/RPC and existing eight-currency/Express/savings guards intact.
-- Explicit, owner-scoped, atomic budget conversion. No real money transfers.
begin;
create or replace function public.clair_fx_amount_v2(n numeric, src text, dst text, policy_id text)
returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare a numeric; b numeric; q numeric; v numeric;
begin
  if policy_id is distinct from 'inforeuro-2026-11' then raise exception 'Unsupported exchange policy' using errcode='22023';end if;
  a:=case src when 'EUR' then 100000 when 'USD' then 111300 when 'GBP' then 83578 when 'MAD' then 1098365 when 'CAD' then 155770 when 'CHF' then 92220 when 'XOF' then 65595700 when 'XAF' then 65595700 else null end;
  b:=case dst when 'EUR' then 100000 when 'USD' then 111300 when 'GBP' then 83578 when 'MAD' then 1098365 when 'CAD' then 155770 when 'CHF' then 92220 when 'XOF' then 65595700 when 'XAF' then 65595700 else null end;
  if a is null or b is null or n is null or n<>trunc(n) then raise exception 'Invalid currency or amount' using errcode='22023';end if;
  q:=case when dst in ('XOF','XAF') then 100 else 1 end;
  v:=round(n*b/a/q)*q;
  if abs(v)>10000000000 or (n<>0 and v=0) then raise exception 'Un montant est trop faible ou trop élevé pour cette conversion.' using errcode='22023';end if;
  return v;
end;$$;
revoke all on function public.clair_fx_amount_v2(numeric,text,text,text) from public,anon;
grant execute on function public.clair_fx_amount_v2(numeric,text,text,text) to authenticated;

create or replace function public.clair_fx_payload_v2(p jsonb, dst text, as_of date, policy_id text)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare src text:=coalesce(p->>'currency','EUR'); o jsonb:=p; k text; item jsonb; result jsonb; nested jsonb; month_key text; raw_balance numeric; new_balance numeric;
begin
  if policy_id is distinct from 'inforeuro-2026-11' then raise exception 'Unsupported exchange policy' using errcode='22023';end if;
  if dst not in ('EUR','USD','GBP','MAD','CAD','CHF','XOF','XAF') or dst is null or as_of is null or p->>'initialized'<>'true' then raise exception 'Invalid conversion' using errcode='22023';end if;
  if src=dst then return p;end if;
  o:=o||jsonb_build_object('currency',dst,'currencyRevision',coalesce((p->>'currencyRevision')::bigint,0)+1,'openingCents',public.clair_fx_amount_v2((p->>'openingCents')::numeric,src,dst,policy_id));
  foreach k in array array['transactions','rules','savingsProjects','fixedExpenses'] loop
    result:='[]';
    for item in select value from jsonb_array_elements(coalesce(p->k,'[]')) loop
      if k='transactions' then item:=item||jsonb_build_object('amountCents',public.clair_fx_amount_v2((item->>'amountCents')::numeric,src,dst,policy_id));end if;
      if k='rules' then
        select coalesce(jsonb_agg(public.clair_fx_amount_v2(value::numeric,src,dst,policy_id)),'[]') into nested from jsonb_array_elements_text(coalesce(item->'amounts','[]'));
        item:=item||jsonb_build_object('amountCents',public.clair_fx_amount_v2(coalesce((item->>'amountCents')::numeric,0),src,dst,policy_id),'amounts',nested);
      end if;
      if k='savingsProjects' then item:=item||jsonb_build_object('targetCents',public.clair_fx_amount_v2((item->>'targetCents')::numeric,src,dst,policy_id));end if;
      if k='fixedExpenses' then item:=item||jsonb_build_object('amount',public.clair_fx_amount_v2((item->>'amount')::numeric*100,src,dst,policy_id)/100);end if;
      result:=result||jsonb_build_array(item);
    end loop;
    o:=jsonb_set(o,array[k],result);
  end loop;
  select coalesce(jsonb_object_agg(key,public.clair_fx_amount_v2(value::numeric*100,src,dst,policy_id)/100),'{}') into result from jsonb_each_text(coalesce(p->'budgets','{}'));o:=jsonb_set(o,'{budgets}',result);
  result:='{}';
  for month_key,item in select key,value from jsonb_each(coalesce(p->'budgetOverrides','{}')) loop
    select coalesce(jsonb_object_agg(key,public.clair_fx_amount_v2(value::numeric*100,src,dst,policy_id)/100),'{}') into nested from jsonb_each_text(item);
    result:=result||jsonb_build_object(month_key,nested);
  end loop;
  o:=o||jsonb_build_object('budgetOverrides',result,'savingsGoal',public.clair_fx_amount_v2(coalesce((p->>'savingsGoal')::numeric,0)*100,src,dst,policy_id)/100);
  select (p->>'openingCents')::numeric+coalesce(sum(case when value->>'type'='income' then 1 else -1 end*(value->>'amountCents')::numeric),0) into raw_balance from jsonb_array_elements(coalesce(p->'transactions','[]')) where (value->>'date')::date<=as_of;
  select (o->>'openingCents')::numeric+coalesce(sum(case when value->>'type'='income' then 1 else -1 end*(value->>'amountCents')::numeric),0) into new_balance from jsonb_array_elements(o->'transactions') where (value->>'date')::date<=as_of;
  o:=jsonb_set(o,'{openingCents}',to_jsonb((o->>'openingCents')::numeric+public.clair_fx_amount_v2(raw_balance,src,dst,policy_id)-new_balance));
  if abs((o->>'openingCents')::numeric)>10000000000 then raise exception 'Opening balance out of range' using errcode='22023';end if;
  -- Check chronological project savings after rounding; never create an overdraft.
  if exists(select 1 from (select sum(case when x->>'type'='income' then -1 else 1 end*(x->>'amountCents')::numeric) over(partition by x->>'savingsProjectId' order by x->>'date',idx) as total from jsonb_array_elements(o->'transactions') with ordinality t(x,idx) where x->>'savingsProjectId' is not null) t where total<0) then raise exception 'Les arrondis rendraient une épargne négative. Conversion annulée.' using errcode='22023';end if;
  return o;
end;$$;
revoke all on function public.clair_fx_payload_v2(jsonb,text,date,text) from public,anon;
grant execute on function public.clair_fx_payload_v2(jsonb,text,date,text) to authenticated;

create or replace function public.convert_clair_currency_v2(p_currency text,p_expected_revision bigint,p_operation_id uuid,p_as_of date,p_policy_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); r public.clair_budgets%rowtype; converted jsonb;
begin
  if p_policy_id is distinct from 'inforeuro-2026-11' then raise exception 'Unsupported exchange policy' using errcode='22023';end if;
  if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
  if p_operation_id is null or p_expected_revision is null or p_currency is null or p_as_of is null or abs(p_as_of-(now() at time zone 'Europe/Paris')::date)>1 then raise exception 'Invalid conversion parameters' using errcode='22023';end if;
  select * into r from public.clair_budgets where user_id=owner_id for update;
  if not found then return jsonb_build_object('saved',false,'row',null);end if;
  if r.operation_id=p_operation_id then return jsonb_build_object('saved',true,'row',to_jsonb(r));end if;
  if r.revision<>p_expected_revision then return jsonb_build_object('saved',false,'row',to_jsonb(r));end if;
  converted:=public.clair_fx_payload_v2(r.payload,p_currency,p_as_of,p_policy_id);
  perform set_config('clair.currency_operation',p_operation_id::text,true);
  update public.clair_budgets set payload=converted,revision=revision+1,operation_id=p_operation_id,updated_at=now() where user_id=owner_id returning * into r;
  perform set_config('clair.currency_operation','',true);
  return jsonb_build_object('saved',true,'row',to_jsonb(r));
end;$$;
revoke all on function public.convert_clair_currency_v2(text,bigint,uuid,date,text) from public,anon;
grant execute on function public.convert_clair_currency_v2(text,bigint,uuid,date,text) to authenticated;
commit;
