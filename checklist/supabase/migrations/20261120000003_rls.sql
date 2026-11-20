-- Em Ordem: Row Level Security em todas as tabelas

alter table public.profiles enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_members enable row level security;
alter table public.checklist_items enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.activity_log enable row level security;
alter table private.config enable row level security;
alter table private.convites enable row level security;

-- Visitantes não logados não acessam nada
revoke all on all tables in schema public from anon;
revoke all on all tables in schema private from anon, authenticated;

-- profiles ------------------------------------------------------------
-- Leitura só de colunas não sensíveis (e-mail só via função de admin no servidor).
-- Alterações só pelo servidor (service role), depois de conferir que quem pediu é admin.
revoke all on public.profiles from authenticated;
grant select (id, nome, role, ativo, is_owner, created_at) on public.profiles to authenticated;

create policy "perfis: usuários ativos veem a equipe"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_ativo()));

-- checklists ----------------------------------------------------------
create policy "checklists: ver os permitidos"
  on public.checklists for select to authenticated
  using (private.pode_ver_checklist(id));

create policy "checklists: admin cria"
  on public.checklists for insert to authenticated
  with check ((select private.is_admin()));

create policy "checklists: admin edita"
  on public.checklists for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "checklists: admin exclui"
  on public.checklists for delete to authenticated
  using ((select private.is_admin()));

-- checklist_members ---------------------------------------------------
create policy "membros: ver nos checklists permitidos"
  on public.checklist_members for select to authenticated
  using (private.pode_ver_checklist(checklist_id));

create policy "membros: admin adiciona"
  on public.checklist_members for insert to authenticated
  with check ((select private.is_admin()));

create policy "membros: admin remove"
  on public.checklist_members for delete to authenticated
  using ((select private.is_admin()));

-- checklist_items -----------------------------------------------------
create policy "itens: ver os permitidos"
  on public.checklist_items for select to authenticated
  using (private.pode_ver_item(checklist_id, responsavel_id));

create policy "itens: admin cria"
  on public.checklist_items for insert to authenticated
  with check ((select private.is_admin()));

-- Colaborador pode atualizar (o gatilho só deixa mudar concluido/comentario)
create policy "itens: marcar e comentar nos permitidos"
  on public.checklist_items for update to authenticated
  using (private.pode_ver_item(checklist_id, responsavel_id))
  with check (private.pode_ver_item(checklist_id, responsavel_id));

create policy "itens: admin exclui"
  on public.checklist_items for delete to authenticated
  using ((select private.is_admin()));

-- templates / template_items (somente admin) --------------------------
create policy "modelos: admin ve" on public.templates for select to authenticated
  using ((select private.is_admin()));
create policy "modelos: admin cria" on public.templates for insert to authenticated
  with check ((select private.is_admin()));
create policy "modelos: admin edita" on public.templates for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "modelos: admin exclui" on public.templates for delete to authenticated
  using ((select private.is_admin()));

create policy "itens de modelo: admin ve" on public.template_items for select to authenticated
  using ((select private.is_admin()));
create policy "itens de modelo: admin cria" on public.template_items for insert to authenticated
  with check ((select private.is_admin()));
create policy "itens de modelo: admin edita" on public.template_items for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "itens de modelo: admin exclui" on public.template_items for delete to authenticated
  using ((select private.is_admin()));

-- activity_log (só leitura; quem grava é o gatilho) -------------------
revoke insert, update, delete on public.activity_log from authenticated;

create policy "histórico: ver dos checklists permitidos"
  on public.activity_log for select to authenticated
  using (
    (select private.is_admin())
    or (
      private.pode_ver_checklist(checklist_id)
      and (private.is_membro(checklist_id) or user_id = (select auth.uid()))
    )
  );
