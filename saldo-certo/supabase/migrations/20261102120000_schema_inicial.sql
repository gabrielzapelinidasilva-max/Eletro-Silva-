-- =====================================================================
-- Saldo Certo — esquema inicial
-- Tabelas, RLS, índices, view monthly_summary e desconto automático
-- dos gastos fixos (a cada 30 dias) com pg_cron.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Função auxiliar: "hoje" no fuso de São Paulo
-- ---------------------------------------------------------------------
create or replace function public.today_sp()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.incomes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 120),
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null,
  category    text not null check (category in ('Salário','Freelance','Vendas','Outros')),
  created_at  timestamptz not null default now()
);

create table public.fixed_expenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description      text not null check (char_length(description) between 1 and 120),
  amount           numeric(12,2) not null check (amount > 0),
  category         text not null check (category in ('Alimentação','Transporte','Lazer','Saúde','Casa','Compras','Outros')),
  start_date       date not null,
  -- Preenchida automaticamente com start_date pelo trigger de inserção.
  next_charge_date date not null default public.today_sp(),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description      text not null check (char_length(description) between 1 and 120),
  amount           numeric(12,2) not null check (amount > 0),
  date             date not null,
  category         text not null check (category in ('Alimentação','Transporte','Lazer','Saúde','Casa','Compras','Outros')),
  fixed_expense_id uuid null references public.fixed_expenses (id) on delete set null,
  -- Marca permanente de "gasto fixo": continua true mesmo se o gasto fixo
  -- de origem for excluído (fixed_expense_id vira null).
  is_fixed         boolean not null default false,
  created_at       timestamptz not null default now()
);

create table public.investments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 120),
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null,
  type        text not null check (type in ('Renda Fixa','Ações','FIIs','Cripto','Poupança','Outros')),
  operation   text not null check (operation in ('aporte','resgate')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index incomes_user_date_idx     on public.incomes (user_id, date);
create index expenses_user_date_idx    on public.expenses (user_id, date);
create index investments_user_date_idx on public.investments (user_id, date);
create index fixed_expenses_user_idx   on public.fixed_expenses (user_id, start_date);
create index fixed_expenses_due_idx    on public.fixed_expenses (next_charge_date) where active;
-- Nunca lançar duas vezes a mesma cobrança de um gasto fixo.
create unique index expenses_fixed_charge_uniq on public.expenses (fixed_expense_id, date);

-- ---------------------------------------------------------------------
-- RLS: cada usuário só enxerga e altera as próprias linhas
-- ---------------------------------------------------------------------
alter table public.incomes        enable row level security;
alter table public.expenses       enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.investments    enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['incomes','expenses','fixed_expenses','investments'] loop
    execute format(
      'create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;

-- Visitantes sem login não acessam nada.
revoke all on public.incomes, public.expenses, public.fixed_expenses, public.investments from anon;

-- Privilégios por coluna: o usuário não pode forjar lançamentos "de gasto
-- fixo" nem mexer nas datas de cobrança — só as funções internas fazem isso.
revoke insert, update on public.expenses from authenticated;
grant insert (description, amount, date, category) on public.expenses to authenticated;
grant update (description, amount, date, category) on public.expenses to authenticated;

revoke insert, update on public.fixed_expenses from authenticated;
grant insert (description, amount, category, start_date, active) on public.fixed_expenses to authenticated;
grant update (description, amount, category, active) on public.fixed_expenses to authenticated;

-- ---------------------------------------------------------------------
-- Desconto automático dos gastos fixos
-- ---------------------------------------------------------------------

-- Lança todas as cobranças devidas de UM gasto fixo (uso interno).
create or replace function public.charge_fixed_expense(p_fixed_expense_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  fe       public.fixed_expenses%rowtype;
  v_today  date := public.today_sp();
  v_count  integer := 0;
begin
  -- Trava a linha para evitar corrida entre o cron e o app.
  select * into fe
    from public.fixed_expenses
   where id = p_fixed_expense_id
   for update;

  if not found or not fe.active then
    return 0;
  end if;

  -- Repete enquanto estiver atrasado (cobre dias em que o job não rodou).
  while fe.next_charge_date <= v_today loop
    insert into public.expenses
      (user_id, description, amount, date, category, fixed_expense_id, is_fixed)
    values
      (fe.user_id, fe.description, fe.amount, fe.next_charge_date, fe.category, fe.id, true)
    on conflict (fixed_expense_id, date) do nothing;

    if found then
      v_count := v_count + 1;
    end if;

    fe.next_charge_date := fe.next_charge_date + 30;
  end loop;

  update public.fixed_expenses
     set next_charge_date = fe.next_charge_date
   where id = fe.id
     and next_charge_date is distinct from fe.next_charge_date;

  return v_count;
end;
$$;

-- Processa todos os gastos fixos ativos e vencidos (roda no pg_cron).
create or replace function public.process_fixed_expenses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r       record;
  v_total integer := 0;
begin
  for r in
    select id
      from public.fixed_expenses
     where active
       and next_charge_date <= public.today_sp()
  loop
    v_total := v_total + public.charge_fixed_expense(r.id);
  end loop;
  return v_total;
end;
$$;

-- Só o banco (postgres / pg_cron) executa essas funções.
revoke all on function public.charge_fixed_expense(uuid) from public, anon, authenticated;
revoke all on function public.process_fixed_expenses()  from public, anon, authenticated;

-- BEFORE INSERT/UPDATE: next_charge_date = start_date ao cadastrar e,
-- ao reativar um gasto pausado, pula as datas do período em que ficou pausado.
create or replace function public.fixed_expenses_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := public.today_sp();
begin
  if tg_op = 'INSERT' then
    new.next_charge_date := new.start_date;
  elsif new.active and not old.active then
    -- Enquanto pausado nada é cobrado: avança em passos de 30 dias até hoje.
    while new.next_charge_date < v_today loop
      new.next_charge_date := new.next_charge_date + 30;
    end loop;
  end if;
  return new;
end;
$$;

create trigger fixed_expenses_before_write
  before insert or update on public.fixed_expenses
  for each row execute function public.fixed_expenses_before_write();

-- AFTER INSERT/UPDATE: se a data já passou (ou é hoje), lança as cobranças na hora.
create or replace function public.fixed_expenses_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active
     and new.next_charge_date <= public.today_sp() then
    perform public.charge_fixed_expense(new.id);
  end if;
  return null;
end;
$$;

revoke all on function public.fixed_expenses_after_write()  from public, anon, authenticated;
revoke all on function public.fixed_expenses_before_write() from public, anon, authenticated;

create trigger fixed_expenses_after_write
  after insert or update of active on public.fixed_expenses
  for each row execute function public.fixed_expenses_after_write();

-- ---------------------------------------------------------------------
-- View de resumo mensal (respeita o RLS de quem consulta)
-- ---------------------------------------------------------------------
create or replace view public.monthly_summary
with (security_invoker = true)
as
with movements as (
  select user_id, date_trunc('month', date)::date as month,
         amount as incomes, 0::numeric as variable_expenses,
         0::numeric as fixed_expenses, 0::numeric as invested
    from public.incomes
  union all
  select user_id, date_trunc('month', date)::date,
         0, case when is_fixed then 0 else amount end,
         case when is_fixed then amount else 0 end, 0
    from public.expenses
  union all
  select user_id, date_trunc('month', date)::date,
         0, 0, 0, case when operation = 'aporte' then amount else -amount end
    from public.investments
)
select
  user_id,
  month,
  sum(incomes)::numeric(14,2)           as total_incomes,
  sum(variable_expenses)::numeric(14,2) as total_variable_expenses,
  sum(fixed_expenses)::numeric(14,2)    as total_fixed_expenses,
  sum(invested)::numeric(14,2)          as total_invested,
  (sum(incomes) - sum(variable_expenses) - sum(fixed_expenses) - sum(invested))::numeric(14,2) as balance
from movements
group by user_id, month;

grant select on public.monthly_summary to authenticated;
revoke all on public.monthly_summary from anon;

-- ---------------------------------------------------------------------
-- pg_cron: todo dia às 03:00 de Brasília (06:00 UTC)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'process-fixed-expenses',
  '0 6 * * *',
  $$select public.process_fixed_expenses();$$
);
