-- Explicit, owner-scoped, atomic budget conversion. No real money transfers.
begin;
create or replace function public.clair_fx_amount(n numeric, src text, dst text)
returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare a numeric; b numeric; q numeric; v numeric;
begin
  a:=case src when 'EUR' then 100000 when 'USD' then 112087 when 'XOF' then 65595700 when 'XAF' then 65595700 else null end;
  b:=case dst when 'EUR' then 100000 when 'USD' then 112087 when 'XOF' then 65595700 when 'XAF' then 65595700 else null end;
  if a is null or b is null or n is null or n<>trunc(n) then raise exception 'Invalid currency or amount' using errcode='22023';end if;
  q:=case when dst in ('XOF','XAF') then 100 else 1 end;
  v:=round(n*b/a/q)*q;
  if abs(v)>10000000000 or (n<>0 and v=0) then raise exception 'Un montant est trop faible ou trop élevé pour cette conversion.' using errcode='22023';end if;
  return v;
end;$$;
revoke all on function public.clair_fx_amount(numeric,text,text) from public,anon;
grant execute on function public.clair_fx_amount(numeric,text,text) to authenticated;

create or replace function public.clair_fx_payload(p jsonb, dst text, as_of date)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare src text:=coalesce(p->>'currency','EUR'); o jsonb:=p; k text; item jsonb; result jsonb; nested jsonb; month_key text; raw_balance numeric; new_balance numeric;
begin
  if dst not in ('EUR','USD','XOF','XAF') or dst is null or as_of is null or p->>'initialized'<>'true' then raise exception 'Invalid conversion' using errcode='22023';end if;
  if src=dst then return p;end if;
  o:=o||jsonb_build_object('currency',dst,'currencyRevision',coalesce((p->>'currencyRevision')::bigint,0)+1,'openingCents',public.clair_fx_amount((p->>'openingCents')::numeric,src,dst));
  foreach k in array array['transactions','rules','savingsProjects','fixedExpenses'] loop
    result:='[]';
    for item in select value from jsonb_array_elements(coalesce(p->k,'[]')) loop
      if k='transactions' then item:=item||jsonb_build_object('amountCents',public.clair_fx_amount((item->>'amountCents')::numeric,src,dst));end if;
      if k='rules' then
        select coalesce(jsonb_agg(public.clair_fx_amount(value::numeric,src,dst)),'[]') into nested from jsonb_array_elements_text(coalesce(item->'amounts','[]'));
        item:=item||jsonb_build_object('amountCents',public.clair_fx_amount(coalesce((item->>'amountCents')::numeric,0),src,dst),'amounts',nested);
      end if;
      if k='savingsProjects' then item:=item||jsonb_build_object('targetCents',public.clair_fx_amount((item->>'targetCents')::numeric,src,dst));end if;
      if k='fixedExpenses' then item:=item||jsonb_build_object('amount',public.clair_fx_amount((item->>'amount')::numeric*100,src,dst)/100);end if;
      result:=result||jsonb_build_array(item);
    end loop;
    o:=jsonb_set(o,array[k],result);
  end loop;
  select coalesce(jsonb_object_agg(key,public.clair_fx_amount(value::numeric*100,src,dst)/100),'{}') into result from jsonb_each_text(coalesce(p->'budgets','{}'));o:=jsonb_set(o,'{budgets}',result);
  result:='{}';
  for month_key,item in select key,value from jsonb_each(coalesce(p->'budgetOverrides','{}')) loop
    select coalesce(jsonb_object_agg(key,public.clair_fx_amount(value::numeric*100,src,dst)/100),'{}') into nested from jsonb_each_text(item);
    result:=result||jsonb_build_object(month_key,nested);
  end loop;
  o:=o||jsonb_build_object('budgetOverrides',result,'savingsGoal',public.clair_fx_amount(coalesce((p->>'savingsGoal')::numeric,0)*100,src,dst)/100);
  select (p->>'openingCents')::numeric+coalesce(sum(case when value->>'type'='income' then 1 else -1 end*(value->>'amountCents')::numeric),0) into raw_balance from jsonb_array_elements(coalesce(p->'transactions','[]')) where (value->>'date')::date<=as_of;
  select (o->>'openingCents')::numeric+coalesce(sum(case when value->>'type'='income' then 1 else -1 end*(value->>'amountCents')::numeric),0) into new_balance from jsonb_array_elements(o->'transactions') where (value->>'date')::date<=as_of;
  o:=jsonb_set(o,'{openingCents}',to_jsonb((o->>'openingCents')::numeric+public.clair_fx_amount(raw_balance,src,dst)-new_balance));
  if abs((o->>'openingCents')::numeric)>10000000000 then raise exception 'Opening balance out of range' using errcode='22023';end if;
  -- Check chronological project savings after rounding; never create an overdraft.
  if exists(select 1 from (select sum(case when x->>'type'='income' then -1 else 1 end*(x->>'amountCents')::numeric) over(partition by x->>'savingsProjectId' order by x->>'date',idx) as total from jsonb_array_elements(o->'transactions') with ordinality t(x,idx) where x->>'savingsProjectId' is not null) t where total<0) then raise exception 'Les arrondis rendraient une épargne négative. Conversion annulée.' using errcode='22023';end if;
  return o;
end;$$;
revoke all on function public.clair_fx_payload(jsonb,text,date) from public,anon;
grant execute on function public.clair_fx_payload(jsonb,text,date) to authenticated;

create or replace function public.clair_guard_currency() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if coalesce(new.payload->>'currency','EUR') not in ('EUR','USD','XOF','XAF') then raise exception 'Unsupported Clair currency' using errcode='22023';end if;
  if TG_OP='UPDATE' and old.payload->>'initialized'='true' and new.payload->>'initialized'='true' and
    (coalesce(old.payload->>'currency','EUR')<>coalesce(new.payload->>'currency','EUR') or coalesce(old.payload->>'currencyRevision','0')<>coalesce(new.payload->>'currencyRevision','0'))
    and coalesce(current_setting('clair.currency_operation',true),'')<>new.operation_id::text then
    raise exception 'Utilise le changement de devise dans une version à jour de Clair.' using errcode='22023';
  end if;
  return new;
end;$$;
revoke all on function public.clair_guard_currency() from public,anon,authenticated;

create or replace function public.convert_clair_currency(p_currency text,p_expected_revision bigint,p_operation_id uuid,p_as_of date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); r public.clair_budgets%rowtype; converted jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501';end if;
  if p_operation_id is null or p_expected_revision is null or p_currency is null or p_as_of is null or abs(p_as_of-(now() at time zone 'Europe/Paris')::date)>1 then raise exception 'Invalid conversion parameters' using errcode='22023';end if;
  select * into r from public.clair_budgets where user_id=owner_id for update;
  if not found then return jsonb_build_object('saved',false,'row',null);end if;
  if r.operation_id=p_operation_id then return jsonb_build_object('saved',true,'row',to_jsonb(r));end if;
  if r.revision<>p_expected_revision then return jsonb_build_object('saved',false,'row',to_jsonb(r));end if;
  converted:=public.clair_fx_payload(r.payload,p_currency,p_as_of);
  perform set_config('clair.currency_operation',p_operation_id::text,true);
  update public.clair_budgets set payload=converted,revision=revision+1,operation_id=p_operation_id,updated_at=now() where user_id=owner_id returning * into r;
  perform set_config('clair.currency_operation','',true);
  return jsonb_build_object('saved',true,'row',to_jsonb(r));
end;$$;
revoke all on function public.convert_clair_currency(text,bigint,uuid,date) from public,anon;
grant execute on function public.convert_clair_currency(text,bigint,uuid,date) to authenticated;
commit;
