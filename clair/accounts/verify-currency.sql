-- Disposable CI database only; never run this file against production.
create table public.clair_budgets(id int primary key,payload jsonb not null);
\ir currency-compatibility.sql
do $$
declare code text; blocked boolean;
begin
  foreach code in array array['EUR','USD','XOF','XAF'] loop
    insert into public.clair_budgets values(1,jsonb_build_object('initialized',true,'currency',code));
    update public.clair_budgets set payload=payload||'{"openingCents":100000}';
    blocked:=false;
    begin update public.clair_budgets set payload=payload||jsonb_build_object('currency',case when code='EUR' then 'USD' else 'EUR' end);
    exception when invalid_parameter_value then blocked:=true;end;
    if not blocked then raise exception 'Currency changed on an initialized budget';end if;
    if code<>'EUR' then
      blocked:=false;
      begin update public.clair_budgets set payload=payload-'currency';exception when invalid_parameter_value then blocked:=true;end;
      if not blocked then raise exception 'Old client stripped currency';end if;
    end if;
    delete from public.clair_budgets;
  end loop;
  insert into public.clair_budgets values(1,'{"initialized":true}');
  update public.clair_budgets set payload=payload||'{"currency":"EUR"}';
  delete from public.clair_budgets;
  insert into public.clair_budgets values(1,'{"initialized":false,"currency":"EUR"}');
  update public.clair_budgets set payload='{"initialized":true,"currency":"XOF"}';
  blocked:=false;
  begin insert into public.clair_budgets values(2,'{"currency":"GBP"}');exception when invalid_parameter_value then blocked:=true;end;
  if not blocked then raise exception 'Unsupported currency accepted';end if;
end;
$$;
select 'PASS currency trigger: four currencies, legacy EUR, first setup, same-currency edits, old-client and invalid-currency rejection' as result;
