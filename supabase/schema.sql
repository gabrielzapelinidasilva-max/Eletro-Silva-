-- Eletro Silva: rode este arquivo no Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

-- Catálogo
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in (
    'fios-e-cabos','disjuntores-e-quadros','tomadas-e-interruptores','iluminacao-e-led',
    'eletrodutos-e-conexoes','ferramentas-e-epis','ventiladores-e-chuveiros')),
  nome text not null,
  descricao text,
  imagem_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ofertas da semana
create table if not exists public.ofertas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  preco_de numeric(10,2),
  preco_por numeric(10,2),
  imagem_url text,
  valido_ate date,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sorteios (o site mostra o mais recente com ativo = true)
create table if not exists public.sorteios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  regulamento text not null,
  data_sorteio date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Contatos enviados pelo formulário de fornecedores
create table if not exists public.fornecedores_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa text not null check (char_length(empresa) between 2 and 200),
  contato text not null check (char_length(contato) between 2 and 200),
  telefone text not null check (char_length(telefone) between 8 and 30),
  email text not null check (char_length(email) between 5 and 200),
  produtos text not null check (char_length(produtos) between 2 and 3000),
  created_at timestamptz not null default now()
);

-- Segurança: visitantes só leem o que está ativo e só inserem contatos.
alter table public.produtos enable row level security;
alter table public.ofertas enable row level security;
alter table public.sorteios enable row level security;
alter table public.fornecedores_contatos enable row level security;

drop policy if exists "leitura publica produtos" on public.produtos;
create policy "leitura publica produtos" on public.produtos for select to anon using (ativo);

drop policy if exists "leitura publica ofertas" on public.ofertas;
create policy "leitura publica ofertas" on public.ofertas for select to anon using (ativo);

drop policy if exists "leitura publica sorteios" on public.sorteios;
create policy "leitura publica sorteios" on public.sorteios for select to anon using (ativo);

drop policy if exists "envio publico fornecedores" on public.fornecedores_contatos;
create policy "envio publico fornecedores" on public.fornecedores_contatos for insert to anon with check (true);
-- Sem policy de select para anon: os contatos só aparecem no painel do Supabase.

-- Bucket público para fotos de produtos e ofertas (suba as imagens pelo painel → Storage).
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

-- Exemplos (pode apagar depois)
insert into public.produtos (categoria, nome, descricao, ordem) values
  ('fios-e-cabos', 'Cabo flexível 2,5 mm² (rolo 100 m)', 'Ideal para tomadas de uso geral.', 1),
  ('fios-e-cabos', 'Cabo flexível 6 mm² (rolo 100 m)', 'Para chuveiros e circuitos de maior carga.', 2),
  ('disjuntores-e-quadros', 'Disjuntor DIN monopolar 20 A', null, 1),
  ('disjuntores-e-quadros', 'Quadro de distribuição 12 disjuntores', null, 2),
  ('tomadas-e-interruptores', 'Tomada 2P+T 10 A', null, 1),
  ('tomadas-e-interruptores', 'Interruptor simples 1 tecla', null, 2),
  ('iluminacao-e-led', 'Lâmpada LED bulbo 9 W', null, 1),
  ('iluminacao-e-led', 'Painel LED sobrepor 18 W', null, 2),
  ('eletrodutos-e-conexoes', 'Eletroduto corrugado 3/4" (rolo 50 m)', null, 1),
  ('ferramentas-e-epis', 'Alicate universal isolado 1000 V', null, 1),
  ('ferramentas-e-epis', 'Luva isolante classe 0', null, 2),
  ('ventiladores-e-chuveiros', 'Chuveiro elétrico 7500 W', null, 1),
  ('ventiladores-e-chuveiros', 'Ventilador de teto 3 pás', null, 2)
on conflict do nothing;
