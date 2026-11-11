-- Eletro Silva – Controle de Horários
-- Etapa 23: quando o colaborador registra a SAÍDA de um atendimento, o agendamento dele
-- naquele dia, para o mesmo cliente, é marcado como concluído (vai para "Serviços concluídos").

create or replace function public.concluir_agendamento_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hora_saida is not null and (tg_op = 'INSERT' or old.hora_saida is null) then
    update public.agendamentos
       set status = 'concluido'
     where colaborador_id = new.usuario_id
       and data = new.data
       and status = 'agendado'
       and lower(btrim(cliente)) = lower(btrim(new.cliente));
  end if;
  return new;
end $$;
revoke execute on function public.concluir_agendamento_do_registro() from public, anon, authenticated;

create or replace trigger registros_concluir_agendamento after insert or update of hora_saida on public.registros
  for each row execute function public.concluir_agendamento_do_registro();
