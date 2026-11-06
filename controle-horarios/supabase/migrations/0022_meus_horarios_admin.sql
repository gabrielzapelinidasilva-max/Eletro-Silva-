-- Eletro Silva – Controle de Horários
-- Etapa 22: o administrador também usa "Meus horários" (registra as próprias horas).
-- Os lembretes de chegada/saída valem para todos que ativarem no celular (inclusive o administrador).

create or replace function public.lembretes_destinatarios(p_segredo text, p_tipo text, p_usuario uuid default null)
returns table (endpoint text, p256dh text, auth text, nome text)
language plpgsql security definer set search_path = public as $$
begin
  perform public._lembretes_conferir(p_segredo);
  return query
    select i.endpoint, i.p256dh, i.auth, p.nome
      from public.push_inscricoes i
      join public.profiles p on p.id = i.usuario_id
     where i.ativa and p.ativo
       and case p_tipo
             -- chegada: quem não está em atendimento agora
             when 'chegada' then not exists (select 1 from public.registros r where r.usuario_id = p.id and r.hora_saida is null)
             -- saída: quem está com atendimento aberto hoje (e não está em intervalo)
             when 'saida' then exists (select 1 from public.registros r where r.usuario_id = p.id and r.hora_saida is null
                                         and r.data = public.hoje_sp() and r.intervalo_inicio is null)
             -- teste: só os celulares de quem pediu
             when 'teste' then p.id = p_usuario
             else false
           end;
end $$;
