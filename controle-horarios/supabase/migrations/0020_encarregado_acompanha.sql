-- Eletro Silva – Controle de Horários
-- Etapa 20: o encarregado acompanha o Resumo e os Registros da equipe (só para ver).

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'registros' and policyname = 'registros: encarregado ve todos') then
    create policy "registros: encarregado ve todos" on public.registros for select to authenticated using (public.is_encarregado());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'localizacoes' and policyname = 'localizacao: encarregado ve') then
    create policy "localizacao: encarregado ve" on public.localizacoes for select to authenticated using (public.is_encarregado());
  end if;
end $$;
