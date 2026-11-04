-- Eletro Silva – Controle de Horários
-- Etapa 18: intervalo. O eletricista pausa o cronômetro (almoço, café...) e depois volta.
-- O tempo de intervalo é descontado das horas trabalhadas (e da mão de obra em Gastos).

alter table public.registros add column if not exists intervalo_inicio time(0);   -- intervalo em andamento
alter table public.registros add column if not exists minutos_intervalo integer not null default 0 check (minutos_intervalo between 0 and 1440);

-- Horas trabalhadas = saída − chegada − intervalos
alter table public.registros alter column minutos_trabalhados set expression as (
  case when hora_saida is null then null
       else greatest(0, (extract(epoch from (hora_saida - hora_chegada)) / 60)::integer - minutos_intervalo) end
);

-- Horas sempre automáticas para quem não é administrador (agora também o intervalo):
--  - chegada e saída = hora do momento;
--  - começar o intervalo grava a hora do momento; voltar soma os minutos;
--  - registrar a saída durante o intervalo encerra o intervalo junto.
create or replace function public.proteger_horas_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_agora time := to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI')::time;
begin
  if auth.uid() is null or public.is_admin() then
    -- Administrador: se fechar a saída com um intervalo aberto, o intervalo termina na saída.
    if new.hora_saida is not null and new.intervalo_inicio is not null then
      new.minutos_intervalo := least(1440, new.minutos_intervalo
        + greatest(0, (extract(epoch from (new.hora_saida - new.intervalo_inicio)) / 60)::integer));
      new.intervalo_inicio := null;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.hora_chegada := v_agora;
    new.hora_saida := null;
    new.intervalo_inicio := null;
    new.minutos_intervalo := 0;
    return new;
  end if;

  new.hora_chegada := old.hora_chegada;
  new.minutos_intervalo := old.minutos_intervalo;
  if old.hora_saida is not null then
    -- Atendimento encerrado: nada de horas muda.
    new.hora_saida := old.hora_saida;
    new.intervalo_inicio := old.intervalo_inicio;
    return new;
  end if;

  if old.intervalo_inicio is not null and (new.intervalo_inicio is null or new.hora_saida is not null) then
    -- Voltou do intervalo (ou saiu durante ele)
    new.minutos_intervalo := least(1440, old.minutos_intervalo
      + greatest(0, (extract(epoch from (v_agora - old.intervalo_inicio)) / 60)::integer));
    new.intervalo_inicio := null;
  elsif old.intervalo_inicio is null and new.intervalo_inicio is not null and new.hora_saida is null then
    new.intervalo_inicio := v_agora;   -- começou o intervalo
  else
    new.intervalo_inicio := old.intervalo_inicio;
  end if;

  if new.hora_saida is not null then
    new.hora_saida := v_agora;
  end if;
  return new;
end $$;
