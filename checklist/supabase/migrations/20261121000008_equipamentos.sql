-- Em Ordem: controle de equipamentos por pessoa (ex.: Gabriel — 5 ferramentas, 3 carros)
-- A pessoa pode ser alguém da equipe (pessoa_id) ou um nome livre (pessoa_nome).

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid references public.profiles (id) on delete cascade,
  pessoa_nome text,
  item text not null check (char_length(trim(item)) > 0),
  quantidade integer not null default 1 check (quantidade >= 0),
  observacao text,
  atualizado_por uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipamentos_tem_pessoa check (
    pessoa_id is not null or char_length(trim(coalesce(pessoa_nome, ''))) > 0
  )
);
create index equipamentos_pessoa_idx on public.equipamentos (pessoa_id);
create index equipamentos_atualizado_por_idx on public.equipamentos (atualizado_por);

create or replace function private.preparar_equipamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.atualizado_por := coalesce((select auth.uid()), new.atualizado_por);
  if new.pessoa_id is not null then new.pessoa_nome := null; end if;
  return new;
end;
$$;
revoke all on function private.preparar_equipamento() from public, anon, authenticated;

create trigger em_ordem_preparar_equipamento
  before insert or update on public.equipamentos
  for each row execute function private.preparar_equipamento();

alter table public.equipamentos enable row level security;
revoke all on public.equipamentos from anon;

-- Admin vê tudo; colaborador vê só o que está com ele
create policy "equipamentos: ver" on public.equipamentos for select to authenticated
  using ((select private.is_admin()) or (pessoa_id = (select auth.uid()) and (select private.is_ativo())));
create policy "equipamentos: admin cria" on public.equipamentos for insert to authenticated
  with check ((select private.is_admin()));
create policy "equipamentos: admin edita" on public.equipamentos for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "equipamentos: admin exclui" on public.equipamentos for delete to authenticated
  using ((select private.is_admin()));

alter publication supabase_realtime add table public.equipamentos;
