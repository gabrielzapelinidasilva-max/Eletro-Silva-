-- Eletro Silva – Controle de Horários
-- Etapa 16: cadastro de clientes (nome, endereço, telefone) para preencher a agenda
-- automaticamente, e "série" de agendamentos (o mesmo serviço repetido em vários dias).

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 200),
  endereco text check (endereco is null or char_length(endereco) <= 300),
  telefone text check (telefone is null or char_length(telefone) <= 30),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists clientes_nome_unico on public.clientes (lower(trim(nome)));

create or replace trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.tocar_atualizado_em();

alter table public.clientes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'clientes' and policyname = 'clientes: so admin') then
    create policy "clientes: so admin" on public.clientes for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
revoke all on public.clientes from anon;

-- Agendamentos criados juntos (repetição em vários dias) têm a mesma série.
alter table public.agendamentos add column if not exists serie_id uuid;
create index if not exists agendamentos_serie_idx on public.agendamentos (serie_id) where serie_id is not null;
