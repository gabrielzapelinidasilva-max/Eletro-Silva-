-- Em Ordem: convites pendentes passam para o schema public (o servidor acessa pela API).
-- RLS ativado: só admins leem; quem grava é o servidor (service role).

create table public.convites (
  email text primary key,
  nome text,
  role text not null check (role in ('admin', 'colaborador')),
  convidado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index convites_convidado_por_idx on public.convites (convidado_por);

alter table public.convites enable row level security;
revoke all on public.convites from anon, authenticated;
grant select on public.convites to authenticated;

create policy "convites: admin ve"
  on public.convites for select to authenticated
  using ((select private.is_admin()));

drop table private.convites;

create or replace function private.ao_criar_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner text;
  v_conv public.convites%rowtype;
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

  select * into v_conv from public.convites where email = v_email;
  if not found then
    raise exception 'Cadastro não permitido: peça um convite a um administrador.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, nome, email, role, ativo)
  values (new.id,
          coalesce(nullif(trim(v_conv.nome), ''), nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(v_email, '@', 1)),
          v_email, v_conv.role, true)
  on conflict (id) do nothing;

  delete from public.convites where email = v_email;
  return new;
end;
$$;
