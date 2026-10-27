-- Eletro Silva – Controle de Horários
-- Etapa 10: última localização de cada colaborador, enviada pelo celular enquanto
-- ele tem um atendimento em andamento e o app está aberto. Só o admin vê.

create table if not exists public.localizacoes (
  usuario_id uuid primary key references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  precisao double precision,
  registro_id uuid references public.registros (id) on delete set null,
  atualizado_em timestamptz not null default now()
);

alter table public.localizacoes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'localizacoes' and policyname = 'localizacao: ver a propria ou admin') then
    create policy "localizacao: ver a propria ou admin" on public.localizacoes for select to authenticated
      using (usuario_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'localizacoes' and policyname = 'localizacao: enviar a propria') then
    create policy "localizacao: enviar a propria" on public.localizacoes for insert to authenticated
      with check (usuario_id = auth.uid() and public.is_ativo());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'localizacoes' and policyname = 'localizacao: atualizar a propria') then
    create policy "localizacao: atualizar a propria" on public.localizacoes for update to authenticated
      using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.is_ativo());
  end if;
end $$;
revoke all on public.localizacoes from anon;
