-- Eletro Silva – Controle de Horários
-- Etapa 21: o encarregado pode corrigir as PRÓPRIAS horas (chegada, saída e intervalo) em "Meus horários".
-- Os outros eletricistas continuam com as horas automáticas. O RLS segue igual:
-- o encarregado só altera os próprios registros de hoje (as horas dos outros, só o administrador).

create or replace function public.proteger_horas_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_agora time := to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI')::time;
begin
  if auth.uid() is null or public.is_admin() or public.is_encarregado() then
    -- Administrador / encarregado: se fechar a saída com um intervalo aberto, o intervalo termina na saída.
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
    new.hora_saida := old.hora_saida;
    new.intervalo_inicio := old.intervalo_inicio;
    return new;
  end if;

  if old.intervalo_inicio is not null and (new.intervalo_inicio is null or new.hora_saida is not null) then
    new.minutos_intervalo := least(1440, old.minutos_intervalo
      + greatest(0, (extract(epoch from (v_agora - old.intervalo_inicio)) / 60)::integer));
    new.intervalo_inicio := null;
  elsif old.intervalo_inicio is null and new.intervalo_inicio is not null and new.hora_saida is null then
    new.intervalo_inicio := v_agora;
  else
    new.intervalo_inicio := old.intervalo_inicio;
  end if;

  if new.hora_saida is not null then
    new.hora_saida := v_agora;
  end if;
  return new;
end $$;
