-- Eletro Silva – Controle de Horários
-- Etapa 5: controle de gastos e lucro por serviço (só o administrador acessa).

-- Configurações gerais (uma única linha, id = 1)
create table if not exists public.configuracoes (
  id smallint primary key default 1 check (id = 1),
  preco_gasolina numeric(6, 3) not null default 6.39 check (preco_gasolina >= 0),
  valor_hora_padrao numeric(10, 2) not null default 0 check (valor_hora_padrao >= 0),
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

-- Veículos da empresa e consumo (km por litro)
create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 60),
  consumo_km_l numeric(5, 2) not null check (consumo_km_l > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists veiculos_nome_unico on public.veiculos (lower(trim(nome)));
insert into public.veiculos (nome, consumo_km_l) values
  ('Celta', 11), ('Uno branco', 12), ('Fiorino', 10), ('Saveiro', 10), ('Hilux', 8)
on conflict do nothing;

-- Lançamento de custos de um serviço.
-- preco_gasolina, consumo_km_l e valor_hora são copiados no dia do lançamento:
-- se os valores mudarem depois, os lançamentos antigos não mudam.
create table if not exists public.custos_servico (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid unique references public.registros (id) on delete set null,
  data date not null,
  cliente text not null check (char_length(trim(cliente)) between 1 and 200),
  descricao text check (descricao is null or char_length(descricao) <= 2000),
  valor_material numeric(10, 2) not null default 0 check (valor_material >= 0),
  veiculo_id uuid references public.veiculos (id) on delete set null,
  veiculo_nome text,
  km_rodados numeric(8, 1) not null default 0 check (km_rodados >= 0),
  consumo_km_l numeric(5, 2) check (consumo_km_l is null or consumo_km_l > 0),
  preco_gasolina numeric(6, 3) not null default 0 check (preco_gasolina >= 0),
  horas numeric(6, 2) not null default 0 check (horas >= 0),
  valor_hora numeric(10, 2) not null default 0 check (valor_hora >= 0),
  valor_servico numeric(10, 2) not null default 0 check (valor_servico >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists custos_servico_data_idx on public.custos_servico (data desc);

create or replace trigger custos_servico_atualizado_em before update on public.custos_servico
  for each row execute function public.tocar_atualizado_em();
create or replace trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- Segurança: só o administrador lê e altera.
alter table public.configuracoes enable row level security;
alter table public.veiculos enable row level security;
alter table public.custos_servico enable row level security;

do $$
declare t text;
begin
  foreach t in array array['configuracoes', 'veiculos', 'custos_servico'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || ': so admin') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || ': so admin', t);
    end if;
  end loop;
end $$;

revoke all on public.configuracoes from anon;
revoke all on public.veiculos from anon;
revoke all on public.custos_servico from anon;
