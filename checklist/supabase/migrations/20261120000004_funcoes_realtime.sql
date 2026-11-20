-- Em Ordem: funções chamadas pelo app (rodam com as permissões de quem chama: RLS vale)

create or replace function public.reordenar_itens(p_checklist uuid, p_ids uuid[])
returns void
language plpgsql security invoker
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Somente administradores podem reordenar itens.' using errcode = '42501';
  end if;
  update public.checklist_items i
     set posicao = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where i.id = o.id and i.checklist_id = p_checklist;
end;
$$;

create or replace function public.salvar_como_modelo(p_checklist uuid, p_nome text)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Somente administradores podem criar modelos.' using errcode = '42501';
  end if;
  insert into public.templates (nome, descricao)
  select trim(p_nome), c.descricao from public.checklists c where c.id = p_checklist
  returning id into v_id;
  if v_id is null then raise exception 'Checklist não encontrado.'; end if;

  insert into public.template_items (template_id, texto, posicao)
  select v_id, i.texto, row_number() over (order by i.posicao, i.created_at)
    from public.checklist_items i where i.checklist_id = p_checklist;
  return v_id;
end;
$$;

create or replace function public.criar_de_modelo(p_template uuid, p_titulo text, p_descricao text, p_prazo date)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Somente administradores podem criar checklists.' using errcode = '42501';
  end if;
  insert into public.checklists (titulo, descricao, prazo)
  values (trim(p_titulo), nullif(trim(coalesce(p_descricao, '')), ''), p_prazo)
  returning id into v_id;

  insert into public.checklist_items (checklist_id, texto, posicao)
  select v_id, t.texto, t.posicao from public.template_items t where t.template_id = p_template;
  return v_id;
end;
$$;

revoke all on function public.reordenar_itens(uuid, uuid[]), public.salvar_como_modelo(uuid, text),
  public.criar_de_modelo(uuid, text, text, date) from public, anon;
grant execute on function public.reordenar_itens(uuid, uuid[]), public.salvar_como_modelo(uuid, text),
  public.criar_de_modelo(uuid, text, text, date) to authenticated;

-- Tempo real ---------------------------------------------------------
alter table public.checklist_items replica identity full;
alter publication supabase_realtime add table
  public.checklists, public.checklist_items, public.checklist_members, public.activity_log;
