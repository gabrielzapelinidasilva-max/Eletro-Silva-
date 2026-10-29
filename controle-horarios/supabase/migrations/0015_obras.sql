-- Eletro Silva – Controle de Horários
-- Etapa 15: serviços em andamento (obras que duram vários dias).
-- O administrador cadastra a obra, escolhe os dias (dias da semana ou dias do mês)
-- e os eletricistas; cada dia vira um agendamento na agenda, ligado à obra.

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  cliente text not null check (char_length(trim(cliente)) between 1 and 200),
  endereco text check (endereco is null or char_length(endereco) <= 300),
  telefone text check (telefone is null or char_length(telefone) <= 30),
  servico text check (servico is null or char_length(servico) <= 2000),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  hora time(0),
  status text not null default 'andamento' check (status in ('andamento', 'concluida')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace trigger obras_atualizado_em before update on public.obras
  for each row execute function public.tocar_atualizado_em();

alter table public.agendamentos add column if not exists obra_id uuid references public.obras (id) on delete cascade;
create index if not exists agendamentos_obra_idx on public.agendamentos (obra_id, data);

alter table public.obras enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'obras' and policyname = 'obras: so admin') then
    create policy "obras: so admin" on public.obras for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
revoke all on public.obras from anon;
