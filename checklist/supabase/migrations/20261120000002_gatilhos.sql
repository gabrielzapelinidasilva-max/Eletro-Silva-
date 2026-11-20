-- Em Ordem: gatilhos (criação de perfil, proteção do admin principal, itens e histórico)

-- Novo usuário no Auth -> cria o perfil. Bloqueia quem não foi convidado.
create or replace function private.ao_criar_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner text;
  v_conv private.convites%rowtype;
  v_email text := lower(new.email);
begin
  select valor into v_owner from private.config where chave = 'owner_email';

  if v_email = lower(v_owner) then
    insert into public.profiles (id, nome, email, role, ativo, is_owner)
    values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(v_email, '@', 1)),
            v_email, 'admin', true, true)
    on conflict (id) do update set role = 'admin', ativo = true, is_owner = true;
    return new;
  end if;

  select * into v_conv from private.convites where email = v_email;
  if not found then
    raise exception 'Cadastro não permitido: peça um convite a um administrador.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, nome, email, role, ativo)
  values (new.id,
          coalesce(nullif(trim(v_conv.nome), ''), nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(v_email, '@', 1)),
          v_email, v_conv.role, true)
  on conflict (id) do nothing;

  delete from private.convites where email = v_email;
  return new;
end;
$$;

create trigger em_ordem_ao_criar_usuario
  after insert on auth.users
  for each row execute function private.ao_criar_usuario();

-- Mantém o e-mail do perfil igual ao do Auth
create or replace function private.ao_mudar_email()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger em_ordem_ao_mudar_email
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.ao_mudar_email();

-- O admin principal não pode ser rebaixado, desativado nem removido
create or replace function private.proteger_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_owner then
      raise exception 'O administrador principal não pode ser removido.' using errcode = '42501';
    end if;
    return old;
  end if;

  new.is_owner := old.is_owner;          -- ninguém muda essa marca
  if old.is_owner and (new.role <> 'admin' or not new.ativo) then
    raise exception 'O administrador principal não pode ser rebaixado nem desativado.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger em_ordem_proteger_owner
  before update or delete on public.profiles
  for each row execute function private.proteger_owner();

-- updated_at
create or replace function private.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger em_ordem_checklists_updated
  before update on public.checklists
  for each row execute function private.tocar_updated_at();

-- Itens: quem concluiu/quando é sempre definido pelo banco,
-- e colaborador só pode mudar "concluido" e "comentario".
create or replace function private.preparar_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and v_uid is not null and not private.is_admin() then
    if new.texto is distinct from old.texto
       or new.posicao is distinct from old.posicao
       or new.responsavel_id is distinct from old.responsavel_id
       or new.prazo is distinct from old.prazo
       or new.checklist_id is distinct from old.checklist_id
       or new.created_at is distinct from old.created_at then
      raise exception 'Colaboradores só podem concluir itens e comentar.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' or new.concluido is distinct from old.concluido then
    if new.concluido then
      new.concluido_por := v_uid;
      new.concluido_em := now();
    else
      new.concluido_por := null;
      new.concluido_em := null;
    end if;
  else
    new.concluido_por := old.concluido_por;
    new.concluido_em := old.concluido_em;
  end if;

  return new;
end;
$$;

create trigger em_ordem_preparar_item
  before insert or update on public.checklist_items
  for each row execute function private.preparar_item();

-- Histórico: marcou / desmarcou / comentou
create or replace function private.registrar_atividade()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if new.concluido is distinct from old.concluido then
    insert into public.activity_log (checklist_id, item_id, user_id, acao, detalhe)
    values (new.checklist_id, new.id, v_uid,
            case when new.concluido then 'marcou' else 'desmarcou' end, new.texto);
  end if;

  if coalesce(new.comentario, '') is distinct from coalesce(old.comentario, '') then
    insert into public.activity_log (checklist_id, item_id, user_id, acao, detalhe)
    values (new.checklist_id, new.id, v_uid,
            case when coalesce(trim(new.comentario), '') = '' then 'removeu o comentário'
                 else 'comentou' end,
            case when coalesce(trim(new.comentario), '') = '' then new.texto
                 else new.texto || ': "' || trim(new.comentario) || '"' end);
  end if;

  return new;
end;
$$;

create trigger em_ordem_registrar_atividade
  after update on public.checklist_items
  for each row execute function private.registrar_atividade();

revoke all on function private.ao_criar_usuario(), private.ao_mudar_email(),
  private.proteger_owner(), private.tocar_updated_at(), private.preparar_item(),
  private.registrar_atividade() from public, anon, authenticated;
