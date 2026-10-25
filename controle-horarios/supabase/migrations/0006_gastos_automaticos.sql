-- Eletro Silva – Controle de Horários
-- Etapa 6: gastos automáticos a partir do registro do eletricista.
-- O eletricista informa, ao registrar a saída, o carro, os km, o material e o valor cobrado.
-- Um gatilho cria e mantém atualizado o lançamento em custos_servico (aba Gastos do admin).

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
