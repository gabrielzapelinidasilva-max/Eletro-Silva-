-- Eletro Silva – Controle de Horários
-- Etapa 3: ninguém chama as funções internas direto pela API.
-- (Gatilhos continuam funcionando; is_admin/is_ativo ficam só para usuários logados, pois o RLS usa.)

revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
revoke execute on function public.sincronizar_email_perfil() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_ativo() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_ativo() to authenticated;
revoke all on public.profiles from anon;
revoke all on public.registros from anon;
