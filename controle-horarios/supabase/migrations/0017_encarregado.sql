-- Eletro Silva – Controle de Horários
-- Etapa 17: encarregado. É um eletricista (mesma tela, mesmos registros de horas)
-- que também vê e mexe na Agenda (agendamentos, serviços em andamento e clientes).

alter table public.profiles add column if not exists encarregado boolean not null default false;

-- Encarregado ativo (eletricista com acesso à agenda)
create or replace function public.is_encarregado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ativo and encarregado and funcao = 'eletricista'
  );
$$;
revoke execute on function public.is_encarregado() from public, anon;
grant execute on function public.is_encarregado() to authenticated;

do $$
declare t text;
begin
  -- Agenda: o encarregado gerencia como o administrador
  foreach t in array array['agendamentos', 'obras', 'clientes'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || ': encarregado gerencia') then
      execute format('create policy %I on public.%I for all to authenticated using (public.is_encarregado()) with check (public.is_encarregado())', t || ': encarregado gerencia', t);
    end if;
  end loop;
  -- Para escolher o eletricista na agenda, o encarregado vê a equipe
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'perfil: encarregado ve a equipe') then
    create policy "perfil: encarregado ve a equipe" on public.profiles for select to authenticated using (public.is_encarregado());
  end if;
end $$;
