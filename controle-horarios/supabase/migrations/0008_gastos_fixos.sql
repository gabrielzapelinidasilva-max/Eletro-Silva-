-- Eletro Silva – Controle de Horários
-- Etapa 8: gastos fixos por mês (salários, ferramentas, manutenção do carro...).
-- O administrador cadastra os gastos fixos; quando o mês termina (último dia), o mês é
-- "fechado": os gastos fixos daquele mês são copiados e descontados do lucro do mês.
-- Os valores copiados podem ser editados depois, sem mexer nos outros meses.

create table if not exists public.gastos_fixos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (char_length(trim(descricao)) between 1 and 120),
  categoria text not null default 'outro' check (categoria in ('salario', 'ferramentas', 'manutencao_carro', 'outro')),
  valor numeric(10, 2) not null check (valor >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Gastos fixos lançados em cada mês fechado
create table if not exists public.gastos_fixos_mes (
  id uuid primary key default gen_random_uuid(),
  mes date not null check (extract(day from mes) = 1),
  gasto_fixo_id uuid references public.gastos_fixos (id) on delete set null,
  descricao text not null check (char_length(trim(descricao)) between 1 and 120),
  categoria text not null default 'outro' check (categoria in ('salario', 'ferramentas', 'manutencao_carro', 'outro')),
  valor numeric(10, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now()
);
create index if not exists gastos_fixos_mes_mes_idx on public.gastos_fixos_mes (mes);

-- Meses já fechados (os gastos fixos já foram lançados)
create table if not exists public.meses_fechados (
  mes date primary key check (extract(day from mes) = 1),
  fechado_em timestamptz not null default now()
);

alter table public.gastos_fixos enable row level security;
alter table public.gastos_fixos_mes enable row level security;
alter table public.meses_fechados enable row level security;
do $$
declare t text;
begin
  foreach t in array array['gastos_fixos', 'gastos_fixos_mes', 'meses_fechados'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || ': so admin') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || ': so admin', t);
    end if;
  end loop;
end $$;
revoke all on public.gastos_fixos from anon;
revoke all on public.gastos_fixos_mes from anon;
revoke all on public.meses_fechados from anon;

-- Fecha os meses que já terminaram (o mês atual fecha no último dia dele).
-- Lança os gastos fixos ativos que já existiam até o fim de cada mês. Só administrador.
create or replace function public.fechar_meses_pendentes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_hoje date := public.hoje_sp();
  v_mes date;
  v_ultimo date;
  v_fechados integer := 0;
begin
  if not public.is_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  select date_trunc('month', min(criado_em at time zone 'America/Sao_Paulo'))::date into v_mes from public.gastos_fixos;
  if v_mes is null then return 0; end if;

  -- Último mês que pode ser fechado: o atual se hoje é o último dia; senão o anterior.
  if (date_trunc('month', v_hoje) + interval '1 month - 1 day')::date = v_hoje then
    v_ultimo := date_trunc('month', v_hoje)::date;
  else
    v_ultimo := (date_trunc('month', v_hoje) - interval '1 month')::date;
  end if;

  while v_mes <= v_ultimo loop
    if not exists (select 1 from public.meses_fechados where mes = v_mes) then
      insert into public.gastos_fixos_mes (mes, gasto_fixo_id, descricao, categoria, valor)
      select v_mes, g.id, g.descricao, g.categoria, g.valor
        from public.gastos_fixos g
       where g.ativo
         and (g.criado_em at time zone 'America/Sao_Paulo')::date <= (v_mes + interval '1 month - 1 day')::date;
      insert into public.meses_fechados (mes) values (v_mes);
      v_fechados := v_fechados + 1;
    end if;
    v_mes := (v_mes + interval '1 month')::date;
  end loop;
  return v_fechados;
end $$;

revoke execute on function public.fechar_meses_pendentes() from public, anon;
grant execute on function public.fechar_meses_pendentes() to authenticated;
