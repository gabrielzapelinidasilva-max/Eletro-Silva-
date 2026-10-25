-- Eletro Silva – Controle de Horários
-- Etapa 1/2: tabelas, funções e gatilhos.
-- Rode no Supabase → SQL Editor → New query → cole tudo → Run.

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
returns date language sql stable as $$
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
returns trigger language plpgsql as $$
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
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, telefone, funcao)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    case when new.raw_app_meta_data ->> 'funcao' = 'admin' then 'admin' else 'eletricista' end
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
