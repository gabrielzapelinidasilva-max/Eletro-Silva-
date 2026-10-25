-- Eletro Silva – Controle de Horários
-- Etapa 2/2: segurança (Row Level Security).
-- Eletricista: vê só os próprios registros e só cria/edita registros de HOJE.
-- Administrador: vê e gerencia tudo.

alter table public.profiles enable row level security;
alter table public.registros enable row level security;

-- PROFILES -------------------------------------------------------------------
drop policy if exists "perfil: ver o proprio ou admin ve todos" on public.profiles;
create policy "perfil: ver o proprio ou admin ve todos" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "perfil: so admin altera" on public.profiles;
create policy "perfil: so admin altera" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- Sem policy de insert/delete: perfis são criados pelo gatilho e gerenciados pelo servidor.

-- REGISTROS ------------------------------------------------------------------
drop policy if exists "registros: ver os proprios ou admin ve todos" on public.registros;
create policy "registros: ver os proprios ou admin ve todos" on public.registros
  for select to authenticated
  using ((usuario_id = auth.uid() and public.is_ativo()) or public.is_admin());

drop policy if exists "registros: criar" on public.registros;
create policy "registros: criar" on public.registros
  for insert to authenticated
  with check (
    public.is_admin()
    or (usuario_id = auth.uid() and data = public.hoje_sp() and public.is_ativo())
  );

drop policy if exists "registros: editar" on public.registros;
create policy "registros: editar" on public.registros
  for update to authenticated
  using (
    public.is_admin()
    or (usuario_id = auth.uid() and data = public.hoje_sp() and public.is_ativo())
  )
  with check (
    public.is_admin()
    or (usuario_id = auth.uid() and data = public.hoje_sp() and public.is_ativo())
  );

drop policy if exists "registros: so admin exclui" on public.registros;
create policy "registros: so admin exclui" on public.registros
  for delete to authenticated
  using (public.is_admin());

-- Visitantes não logados (anon) não têm acesso a nada destas tabelas.
revoke all on public.profiles from anon;
revoke all on public.registros from anon;
