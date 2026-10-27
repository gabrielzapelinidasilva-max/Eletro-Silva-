-- Eletro Silva – Controle de Horários
-- Etapa 11: agenda de serviços. O admin agenda e move serviços entre dias;
-- o eletricista vê os agendamentos que são dele.

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora time(0),
  cliente text not null check (char_length(trim(cliente)) between 1 and 200),
  endereco text check (endereco is null or char_length(endereco) <= 300),
  telefone text check (telefone is null or char_length(telefone) <= 30),
  servico text check (servico is null or char_length(servico) <= 2000),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  colaborador_id uuid references public.profiles (id) on delete set null,
  status text not null default 'agendado' check (status in ('agendado', 'concluido', 'cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists agendamentos_data_idx on public.agendamentos (data);
create index if not exists agendamentos_colaborador_idx on public.agendamentos (colaborador_id, data);

create or replace trigger agendamentos_atualizado_em before update on public.agendamentos
  for each row execute function public.tocar_atualizado_em();

alter table public.agendamentos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'agendamentos' and policyname = 'agenda: admin gerencia') then
    create policy "agenda: admin gerencia" on public.agendamentos for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'agendamentos' and policyname = 'agenda: eletricista ve os seus') then
    create policy "agenda: eletricista ve os seus" on public.agendamentos for select to authenticated
      using (colaborador_id = auth.uid() and public.is_ativo());
  end if;
end $$;
revoke all on public.agendamentos from anon;
