-- Eletro Silva – Controle de Horários
-- Etapa 8: lixeira. O que o administrador exclui (serviço de eletricista ou lançamento avulso)
-- vai para a lixeira com uma cópia completa e pode ser restaurado por 30 dias.

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
