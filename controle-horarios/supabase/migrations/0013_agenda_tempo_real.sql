-- Eletro Silva – Controle de Horários
-- Etapa 13: a agenda aparece na hora para o eletricista (Supabase Realtime).
-- O Realtime respeita o RLS: cada eletricista só recebe os próprios agendamentos.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agendamentos') then
    alter publication supabase_realtime add table public.agendamentos;
  end if;
end $$;
