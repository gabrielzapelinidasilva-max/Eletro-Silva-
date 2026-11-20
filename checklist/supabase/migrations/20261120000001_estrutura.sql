-- Em Ordem: estrutura básica (tabelas, índices, funções auxiliares)

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Configuração interna (não exposta pela API)
create table private.config (
  chave text primary key,
  valor text not null
);

-- Convites pré-autorizados: só e-mails daqui (ou o admin principal) conseguem ter conta
create table private.convites (
  email text primary key,
  nome text,
  role text not null check (role in ('admin', 'colaborador')),
  convidado_por uuid,
  criado_em timestamptz not null default now()
);

-- Perfis --------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  role text not null default 'colaborador' check (role in ('admin', 'colaborador')),
  ativo boolean not null default true,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

-- Checklists ----------------------------------------------------------
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) > 0),
  descricao text,
  prazo date,
  arquivado boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checklist_members (
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checklist_id, user_id)
);
create index checklist_members_user_idx on public.checklist_members (user_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  texto text not null check (char_length(trim(texto)) > 0),
  posicao integer not null default 0,
  responsavel_id uuid references public.profiles (id) on delete set null,
  prazo date,
  concluido boolean not null default false,
  concluido_por uuid references public.profiles (id) on delete set null,
  concluido_em timestamptz,
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checklist_items_checklist_idx on public.checklist_items (checklist_id, posicao);
create index checklist_items_responsavel_idx on public.checklist_items (responsavel_id);
create index checklist_items_concluido_por_idx on public.checklist_items (concluido_por);

-- Modelos -------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) > 0),
  descricao text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  texto text not null check (char_length(trim(texto)) > 0),
  posicao integer not null default 0
);
create index template_items_template_idx on public.template_items (template_id, posicao);

-- Histórico -----------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  item_id uuid references public.checklist_items (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  acao text not null,
  detalhe text,
  created_at timestamptz not null default now()
);
create index activity_log_checklist_idx on public.activity_log (checklist_id, created_at desc);
create index activity_log_item_idx on public.activity_log (item_id);
create index activity_log_user_idx on public.activity_log (user_id);
create index checklists_created_by_idx on public.checklists (created_by);
create index templates_created_by_idx on public.templates (created_by);

-- Funções auxiliares (schema private: não ficam expostas como RPC) ----
create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and ativo
  );
$$;

create or replace function private.is_ativo()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and ativo
  );
$$;

create or replace function private.is_membro(p_checklist uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.checklist_members
    where checklist_id = p_checklist and user_id = (select auth.uid())
  );
$$;

-- Pode ver o checklist: admin, membro ou responsável por algum item (e não arquivado)
create or replace function private.pode_ver_checklist(p_checklist uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_ativo()
    and exists (select 1 from public.checklists c where c.id = p_checklist and not c.arquivado)
    and (
      private.is_membro(p_checklist)
      or exists (
        select 1 from public.checklist_items i
        where i.checklist_id = p_checklist and i.responsavel_id = (select auth.uid())
      )
    )
  );
$$;

-- Pode ver/marcar o item: admin, membro do checklist ou responsável pelo item
create or replace function private.pode_ver_item(p_checklist uuid, p_responsavel uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.is_ativo()
    and exists (select 1 from public.checklists c where c.id = p_checklist and not c.arquivado)
    and (private.is_membro(p_checklist) or p_responsavel = (select auth.uid()))
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function private.is_admin(), private.is_ativo(), private.is_membro(uuid),
  private.pode_ver_checklist(uuid), private.pode_ver_item(uuid, uuid) to authenticated;
