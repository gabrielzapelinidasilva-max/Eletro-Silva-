-- Em Ordem: admin principal (seed)
-- A conta com este e-mail nasce como admin e é marcada como "dono" (is_owner):
-- não pode ser rebaixada, desativada nem removida por outro admin.

insert into private.config (chave, valor)
values ('owner_email', 'gabrielzapelinidasilva@gmail.com')
on conflict (chave) do update set valor = excluded.valor;

-- Cria a conta no Auth (sem senha). O dono define a senha em "Esqueci minha senha".
do $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := 'gabrielzapelinidasilva@gmail.com';
begin
  if exists (select 1 from auth.users where lower(email) = v_email) then
    alter table public.profiles disable trigger em_ordem_proteger_owner;
    update public.profiles set role = 'admin', ativo = true, is_owner = true where email = v_email;
    alter table public.profiles enable trigger em_ordem_proteger_owner;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, '', now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('nome', 'Gabriel'),
    now(), now(), '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (v_id::text, v_id,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now());
end;
$$;
