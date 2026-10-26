-- Eletro Silva – Controle de Horários: INSTALAÇÃO COMPLETA
-- Supabase → SQL Editor → New query → cole TUDO → Run. Pode rodar mais de uma vez.
-- (Junção dos arquivos de supabase/migrations/, na ordem.)


-- Perfis (um por usuário do Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  email text not null,
  telefone text,
  funcao text not null default 'eletricista' check (funcao in ('admin', 'eletricista')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Registros de horário e serviço
create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  -- "restrict": não deixa apagar um colaborador que tem histórico. Desative-o em vez de apagar.
  usuario_id uuid not null references public.profiles (id) on delete restrict,
  data date not null,
  hora_chegada time(0) not null,
  hora_saida time(0),
  cliente text not null check (char_length(trim(cliente)) between 1 and 200),
  servico text check (servico is null or char_length(servico) <= 2000),
  observacoes text check (observacoes is null or char_length(observacoes) <= 5000),
  -- Calculado automaticamente a partir de chegada e saída (null enquanto não houver saída).
  minutos_trabalhados integer generated always as (
    case when hora_saida is null then null
         else (extract(epoch from (hora_saida - hora_chegada)) / 60)::integer end
  ) stored,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint saida_depois_da_chegada check (hora_saida is null or hora_saida >= hora_chegada),
  constraint servico_obrigatorio_na_saida check (hora_saida is null or char_length(trim(coalesce(servico, ''))) > 0)
);

create index if not exists registros_usuario_data_idx on public.registros (usuario_id, data desc);
create index if not exists registros_data_idx on public.registros (data desc);
-- Cada colaborador só pode ter um registro "em aberto" (sem saída) por vez.
create unique index if not exists registros_um_aberto_por_usuario on public.registros (usuario_id) where hora_saida is null;

-- Data de hoje no fuso de São Paulo
create or replace function public.hoje_sp()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Usuário logado é um administrador ativo?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and funcao = 'admin' and ativo
  )
$$;

-- Usuário logado está ativo?
create or replace function public.is_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo)
$$;

-- Mantém atualizado_em em dia
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists registros_atualizado_em on public.registros;
create trigger registros_atualizado_em before update on public.registros
  for each row execute function public.tocar_atualizado_em();

-- Cria o perfil quando um usuário é criado no Supabase Auth.
-- A função (admin/eletricista) vem de app_metadata, que só o servidor (service role) consegue definir.
-- Assim, ninguém consegue se cadastrar sozinho como administrador.
-- Contas sem "funcao" em app_metadata (cadastro feito por fora do app, ou criadas no painel)
-- nascem INATIVAS: não entram até um administrador ativá-las.
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, telefone, funcao, ativo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    case when new.raw_app_meta_data ->> 'funcao' = 'admin' then 'admin' else 'eletricista' end,
    coalesce(new.raw_app_meta_data ->> 'funcao', '') in ('admin', 'eletricista')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Mantém o e-mail do perfil igual ao do login
create or replace function public.sincronizar_email_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists ao_mudar_email on auth.users;
create trigger ao_mudar_email after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sincronizar_email_perfil();


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


revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
revoke execute on function public.sincronizar_email_perfil() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_ativo() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_ativo() to authenticated;
revoke all on public.profiles from anon;
revoke all on public.registros from anon;


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


-- Configurações gerais (uma única linha, id = 1)
create table if not exists public.configuracoes (
  id smallint primary key default 1 check (id = 1),
  preco_gasolina numeric(6, 3) not null default 6.39 check (preco_gasolina >= 0),
  valor_hora_padrao numeric(10, 2) not null default 0 check (valor_hora_padrao >= 0),
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

-- Veículos da empresa e consumo (km por litro)
create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 60),
  consumo_km_l numeric(5, 2) not null check (consumo_km_l > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists veiculos_nome_unico on public.veiculos (lower(trim(nome)));
insert into public.veiculos (nome, consumo_km_l) values
  ('Celta', 11), ('Uno branco', 12), ('Fiorino', 10), ('Saveiro', 10), ('Hilux', 8)
on conflict do nothing;

-- Lançamento de custos de um serviço.
-- preco_gasolina, consumo_km_l e valor_hora são copiados no dia do lançamento:
-- se os valores mudarem depois, os lançamentos antigos não mudam.
create table if not exists public.custos_servico (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid unique references public.registros (id) on delete set null,
  data date not null,
  cliente text not null check (char_length(trim(cliente)) between 1 and 200),
  descricao text check (descricao is null or char_length(descricao) <= 2000),
  valor_material numeric(10, 2) not null default 0 check (valor_material >= 0),
  veiculo_id uuid references public.veiculos (id) on delete set null,
  veiculo_nome text,
  km_rodados numeric(8, 1) not null default 0 check (km_rodados >= 0),
  consumo_km_l numeric(5, 2) check (consumo_km_l is null or consumo_km_l > 0),
  preco_gasolina numeric(6, 3) not null default 0 check (preco_gasolina >= 0),
  horas numeric(6, 2) not null default 0 check (horas >= 0),
  valor_hora numeric(10, 2) not null default 0 check (valor_hora >= 0),
  valor_servico numeric(10, 2) not null default 0 check (valor_servico >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists custos_servico_data_idx on public.custos_servico (data desc);

create or replace trigger custos_servico_atualizado_em before update on public.custos_servico
  for each row execute function public.tocar_atualizado_em();
create or replace trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- Segurança: só o administrador lê e altera.
alter table public.configuracoes enable row level security;
alter table public.veiculos enable row level security;
alter table public.custos_servico enable row level security;

do $$
declare t text;
begin
  foreach t in array array['configuracoes', 'veiculos', 'custos_servico'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || ': so admin') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || ': so admin', t);
    end if;
  end loop;
end $$;

revoke all on public.configuracoes from anon;
revoke all on public.veiculos from anon;
revoke all on public.custos_servico from anon;


alter table public.registros add column if not exists veiculo_id uuid references public.veiculos (id) on delete set null;
alter table public.registros add column if not exists km_rodados numeric(8, 1) not null default 0 check (km_rodados >= 0);
alter table public.registros add column if not exists valor_material numeric(10, 2) not null default 0 check (valor_material >= 0);
-- null = o eletricista não informou (o admin completa na aba Gastos)
alter table public.registros add column if not exists valor_servico numeric(10, 2) check (valor_servico is null or valor_servico >= 0);

-- Lançamentos já ligados a um registro (feitos à mão antes desta etapa) passam seus valores
-- para o registro, para o gatilho abaixo não zerá-los. (Roda antes de o gatilho existir.)
update public.registros r
   set veiculo_id = c.veiculo_id, km_rodados = c.km_rodados, valor_material = c.valor_material,
       valor_servico = nullif(c.valor_servico, 0)
  from public.custos_servico c
 where c.registro_id = r.id
   and r.km_rodados = 0 and r.valor_material = 0 and r.valor_servico is null and r.veiculo_id is null;

-- Eletricistas ativos podem ver a lista de carros (para escolher no registro).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'veiculos' and policyname = 'veiculos: usuarios ativos leem') then
    create policy "veiculos: usuarios ativos leem" on public.veiculos for select to authenticated using (public.is_ativo());
  end if;
end $$;

-- Cria/atualiza o lançamento de gastos do registro.
-- preco_gasolina e valor_hora são copiados só na criação (valores do dia);
-- o consumo do carro só muda se o carro do registro mudar.
create or replace function public.sincronizar_custos_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
  v_consumo numeric;
begin
  -- Sem saída ainda: só atualiza se o lançamento já existir.
  if new.hora_saida is null and not exists (select 1 from public.custos_servico where registro_id = new.id) then
    return new;
  end if;

  select nome, consumo_km_l into v_nome, v_consumo from public.veiculos where id = new.veiculo_id;

  insert into public.custos_servico (
    registro_id, data, cliente, descricao, horas, valor_hora, preco_gasolina,
    veiculo_id, veiculo_nome, consumo_km_l, km_rodados, valor_material, valor_servico
  )
  select new.id, new.data, new.cliente, new.servico, coalesce(new.minutos_trabalhados, 0) / 60.0,
         c.valor_hora_padrao, c.preco_gasolina,
         new.veiculo_id, v_nome, v_consumo, new.km_rodados, new.valor_material, coalesce(new.valor_servico, 0)
    from (select coalesce((select valor_hora_padrao from public.configuracoes where id = 1), 0) as valor_hora_padrao,
                 coalesce((select preco_gasolina from public.configuracoes where id = 1), 6.39) as preco_gasolina) c
  on conflict (registro_id) do update set
    data = excluded.data,
    cliente = excluded.cliente,
    descricao = excluded.descricao,
    horas = excluded.horas,
    km_rodados = excluded.km_rodados,
    valor_material = excluded.valor_material,
    valor_servico = excluded.valor_servico,
    consumo_km_l = case when custos_servico.veiculo_id is distinct from excluded.veiculo_id then excluded.consumo_km_l else custos_servico.consumo_km_l end,
    veiculo_nome = case when custos_servico.veiculo_id is distinct from excluded.veiculo_id then excluded.veiculo_nome else custos_servico.veiculo_nome end,
    veiculo_id = excluded.veiculo_id;
  return new;
end $$;

create or replace trigger registros_sincronizar_custos after insert or update on public.registros
  for each row execute function public.sincronizar_custos_do_registro();

-- Ao excluir um registro, o lançamento de gastos dele também sai.
create or replace function public.excluir_custos_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.custos_servico where registro_id = old.id;
  return old;
end $$;

create or replace trigger registros_excluir_custos before delete on public.registros
  for each row execute function public.excluir_custos_do_registro();

revoke execute on function public.sincronizar_custos_do_registro() from public, anon, authenticated;
revoke execute on function public.excluir_custos_do_registro() from public, anon, authenticated;

-- Trabalhos já encerrados que ainda não têm lançamento ganham um agora.
insert into public.custos_servico (registro_id, data, cliente, descricao, horas, valor_hora, preco_gasolina, km_rodados, valor_material, valor_servico)
select r.id, r.data, r.cliente, r.servico, coalesce(r.minutos_trabalhados, 0) / 60.0,
       coalesce((select valor_hora_padrao from public.configuracoes where id = 1), 0),
       coalesce((select preco_gasolina from public.configuracoes where id = 1), 6.39),
       0, 0, 0
  from public.registros r
 where r.hora_saida is not null
   and not exists (select 1 from public.custos_servico c where c.registro_id = r.id);


create or replace function public.proteger_valores_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = servidor/painel do Supabase: pode tudo.
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.valor_material := 0;
      new.valor_servico := null;
    else
      new.valor_material := old.valor_material;
      new.valor_servico := old.valor_servico;
    end if;
  end if;
  return new;
end $$;

create or replace trigger registros_proteger_valores before insert or update on public.registros
  for each row execute function public.proteger_valores_do_registro();

revoke execute on function public.proteger_valores_do_registro() from public, anon, authenticated;


create table if not exists public.lixeira (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('registro', 'lancamento')),
  registro jsonb,          -- cópia do registro do eletricista (tipo = 'registro')
  lancamento jsonb,        -- cópia do lançamento de gastos (do registro ou avulso)
  -- Resumo para mostrar na tela
  data date,
  cliente text,
  colaborador text,
  excluido_em timestamptz not null default now(),
  excluido_por uuid references public.profiles (id) on delete set null
);
create index if not exists lixeira_excluido_em_idx on public.lixeira (excluido_em desc);

alter table public.lixeira enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lixeira' and policyname = 'lixeira: so admin') then
    create policy "lixeira: so admin" on public.lixeira for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
revoke all on public.lixeira from anon;

-- Ao excluir um registro: guarda registro + gastos na lixeira e depois apaga os gastos.
create or replace function public.excluir_custos_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.lixeira (tipo, registro, lancamento, data, cliente, colaborador, excluido_por)
  values (
    'registro',
    to_jsonb(old),
    (select to_jsonb(c) from public.custos_servico c where c.registro_id = old.id),
    old.data,
    old.cliente,
    (select nome from public.profiles where id = old.usuario_id),
    auth.uid()
  );
  delete from public.custos_servico where registro_id = old.id;
  return old;
end $$;

-- Ao excluir um lançamento avulso: guarda na lixeira.
-- (Lançamentos de registro já vão junto com o registro, pela função acima.)
create or replace function public.lancamento_avulso_para_lixeira()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.registro_id is null then
    insert into public.lixeira (tipo, lancamento, data, cliente, excluido_por)
    values ('lancamento', to_jsonb(old), old.data, old.cliente, auth.uid());
  end if;
  return old;
end $$;

create or replace trigger custos_servico_para_lixeira before delete on public.custos_servico
  for each row execute function public.lancamento_avulso_para_lixeira();

-- Restaura um item da lixeira (só administrador).
create or replace function public.restaurar_da_lixeira(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v public.lixeira%rowtype;
  r jsonb;
  l jsonb;
  v_registro uuid;
  v_veiculo uuid;
begin
  if not public.is_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  select * into v from public.lixeira where id = p_id;
  if not found then raise exception 'nao_encontrado'; end if;
  r := v.registro;
  l := v.lancamento;

  if v.tipo = 'registro' then
    if not exists (select 1 from public.profiles where id = (r ->> 'usuario_id')::uuid) then
      raise exception 'colaborador_nao_existe';
    end if;
    if (r ->> 'hora_saida') is null and exists (
      select 1 from public.registros where usuario_id = (r ->> 'usuario_id')::uuid and hora_saida is null
    ) then
      raise exception 'ja_tem_aberto';
    end if;
    if exists (select 1 from public.registros where id = (r ->> 'id')::uuid) then
      raise exception 'ja_existe';
    end if;
    v_registro := (r ->> 'id')::uuid;
    v_veiculo := (select id from public.veiculos where id = nullif(r ->> 'veiculo_id', '')::uuid);

    insert into public.registros (
      id, usuario_id, data, hora_chegada, hora_saida, cliente, servico, observacoes,
      veiculo_id, km_rodados, valor_material, valor_servico, criado_em
    ) values (
      v_registro, (r ->> 'usuario_id')::uuid, (r ->> 'data')::date, (r ->> 'hora_chegada')::time, (r ->> 'hora_saida')::time,
      r ->> 'cliente', r ->> 'servico', r ->> 'observacoes',
      v_veiculo, coalesce((r ->> 'km_rodados')::numeric, 0), coalesce((r ->> 'valor_material')::numeric, 0),
      (r ->> 'valor_servico')::numeric, coalesce((r ->> 'criado_em')::timestamptz, now())
    );
  end if;

  -- O gatilho do registro já recriou o lançamento; aqui voltam os valores guardados
  -- (preço da gasolina, valor da hora e consumo do dia da exclusão).
  if l is not null then
    insert into public.custos_servico (
      registro_id, data, cliente, descricao, valor_material, veiculo_id, veiculo_nome, km_rodados,
      consumo_km_l, preco_gasolina, horas, valor_hora, valor_servico, criado_em
    ) values (
      v_registro, (l ->> 'data')::date, l ->> 'cliente', l ->> 'descricao', coalesce((l ->> 'valor_material')::numeric, 0),
      (select id from public.veiculos where id = nullif(l ->> 'veiculo_id', '')::uuid), l ->> 'veiculo_nome',
      coalesce((l ->> 'km_rodados')::numeric, 0), (l ->> 'consumo_km_l')::numeric, coalesce((l ->> 'preco_gasolina')::numeric, 0),
      coalesce((l ->> 'horas')::numeric, 0), coalesce((l ->> 'valor_hora')::numeric, 0), coalesce((l ->> 'valor_servico')::numeric, 0),
      coalesce((l ->> 'criado_em')::timestamptz, now())
    )
    on conflict (registro_id) do update set
      consumo_km_l = excluded.consumo_km_l,
      veiculo_nome = excluded.veiculo_nome,
      preco_gasolina = excluded.preco_gasolina,
      valor_hora = excluded.valor_hora,
      criado_em = excluded.criado_em;
  end if;

  delete from public.lixeira where id = p_id;
  return coalesce(v.cliente, 'Item');
end $$;

revoke execute on function public.restaurar_da_lixeira(uuid) from public, anon;
grant execute on function public.restaurar_da_lixeira(uuid) to authenticated;
revoke execute on function public.lancamento_avulso_para_lixeira() from public, anon, authenticated;
