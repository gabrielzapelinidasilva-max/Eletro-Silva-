-- Eletro Silva – Controle de Horários
-- Etapa 14: o eletricista não escolhe a hora de chegada nem a de saída.
-- Quem não é administrador sempre grava a hora do momento (fuso de São Paulo):
--  - ao registrar a chegada, a hora de chegada é a hora atual;
--  - ao registrar a saída, a hora de saída é a hora atual;
--  - depois disso, as horas não mudam mais (só o administrador corrige).

create or replace function public.proteger_horas_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_agora time := to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI')::time;
begin
  -- Administrador (e comandos internos, sem usuário logado) podem ajustar as horas.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.hora_chegada := v_agora;
    new.hora_saida := null;
  else
    new.hora_chegada := old.hora_chegada;
    if old.hora_saida is null and new.hora_saida is not null then
      new.hora_saida := v_agora;
    else
      new.hora_saida := old.hora_saida;
    end if;
  end if;
  return new;
end $$;

create or replace trigger registros_proteger_horas before insert or update on public.registros
  for each row execute function public.proteger_horas_do_registro();

revoke execute on function public.proteger_horas_do_registro() from public, anon, authenticated;
