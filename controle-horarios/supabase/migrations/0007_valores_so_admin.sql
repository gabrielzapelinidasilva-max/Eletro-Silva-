-- Eletro Silva – Controle de Horários
-- Etapa 7: valor do material e valor cobrado só o ADMINISTRADOR define.
-- O eletricista informa apenas carro e km. Se ele (ou qualquer usuário que não seja
-- admin) tentar mudar esses valores, o banco mantém os valores atuais.

create or replace function public.proteger_valores_do_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = servidor/painel do Supabase: pode tudo.
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.valor_material := 0;
      new.valor_servico := null;
    else
      new.valor_material := old.valor_material;
      new.valor_servico := old.valor_servico;
    end if;
  end if;
  return new;
end $$;

create or replace trigger registros_proteger_valores before insert or update on public.registros
  for each row execute function public.proteger_valores_do_registro();

revoke execute on function public.proteger_valores_do_registro() from public, anon, authenticated;
