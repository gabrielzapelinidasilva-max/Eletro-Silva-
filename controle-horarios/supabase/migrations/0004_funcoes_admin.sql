-- Eletro Silva – Controle de Horários
-- Etapa 4: funções para o ADMINISTRADOR gerenciar colaboradores sem precisar da chave service_role.
-- Cada função confere, dentro do banco, se quem chamou é um administrador ativo.
-- O app usa estas funções quando a variável SUPABASE_SERVICE_ROLE_KEY não está configurada.

create extension if not exists pgcrypto with schema extensions;

-- Garante que só um administrador ativo continue.
create or replace function public._exigir_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_criar_colaborador(
  p_nome text, p_email text, p_telefone text, p_senha text, p_funcao text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_funcao text := case when p_funcao = 'admin' then 'admin' else 'eletricista' end;
begin
  perform public._exigir_admin();
  if char_length(coalesce(p_senha, '')) < 6 then raise exception 'senha_curta'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'email_existente'; end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_senha, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'funcao', v_funcao),
    jsonb_build_object('nome', trim(p_nome), 'telefone', nullif(trim(coalesce(p_telefone, '')), '')),
    now(), now(), '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  -- O gatilho já criou o perfil; aqui garantimos os dados.
  update public.profiles
     set nome = trim(p_nome), telefone = nullif(trim(coalesce(p_telefone, '')), ''), funcao = v_funcao, ativo = true
   where id = v_id;
  return v_id;
end $$;

create or replace function public.admin_atualizar_colaborador(
  p_id uuid, p_nome text, p_email text, p_telefone text, p_funcao text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_funcao text := case when p_funcao = 'admin' then 'admin' else 'eletricista' end;
begin
  perform public._exigir_admin();
  if p_id = auth.uid() and v_funcao <> 'admin' then raise exception 'nao_pode_rebaixar_a_si'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'nao_encontrado'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email and id <> p_id) then raise exception 'email_existente'; end if;

  update auth.users
     set email = v_email,
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('funcao', v_funcao),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('nome', trim(p_nome), 'telefone', nullif(trim(coalesce(p_telefone, '')), '')),
         updated_at = now()
   where id = p_id;
  update auth.identities
     set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
   where user_id = p_id and provider = 'email';

  update public.profiles
     set nome = trim(p_nome), email = v_email, telefone = nullif(trim(coalesce(p_telefone, '')), ''), funcao = v_funcao
   where id = p_id;
end $$;

create or replace function public.admin_redefinir_senha(p_id uuid, p_senha text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._exigir_admin();
  if char_length(coalesce(p_senha, '')) < 6 then raise exception 'senha_curta'; end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = p_id;
  if not found then raise exception 'nao_encontrado'; end if;
end $$;

create or replace function public.admin_alterar_status(p_id uuid, p_ativo boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
begin
  perform public._exigir_admin();
  if p_id = auth.uid() and not p_ativo then raise exception 'nao_pode_desativar_a_si'; end if;
  -- "banned_until" no futuro impede o login; o histórico continua guardado.
  update auth.users set banned_until = case when p_ativo then null else now() + interval '100 years' end, updated_at = now()
   where id = p_id;
  update public.profiles set ativo = p_ativo where id = p_id returning nome into v_nome;
  if v_nome is null then raise exception 'nao_encontrado'; end if;
  return v_nome;
end $$;

-- Só usuários logados podem chamar (e as funções conferem se é admin).
revoke execute on function public._exigir_admin() from public, anon, authenticated;
revoke execute on function public.admin_criar_colaborador(text, text, text, text, text) from public, anon;
revoke execute on function public.admin_atualizar_colaborador(uuid, text, text, text, text) from public, anon;
revoke execute on function public.admin_redefinir_senha(uuid, text) from public, anon;
revoke execute on function public.admin_alterar_status(uuid, boolean) from public, anon;
grant execute on function public.admin_criar_colaborador(text, text, text, text, text) to authenticated;
grant execute on function public.admin_atualizar_colaborador(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_redefinir_senha(uuid, text) to authenticated;
grant execute on function public.admin_alterar_status(uuid, boolean) to authenticated;
