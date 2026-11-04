-- Eletro Silva – Controle de Horários
-- Etapa 19: lembretes por notificação no celular (Web Push).
--  07:45 e 13:45 (seg. a sáb.): "Já registrou a chegada?" para quem ainda não está em atendimento;
--  11:50 e 17:45 (todo dia):    "Não esqueça a saída" para quem está com atendimento aberto hoje.
-- O banco agenda (pg_cron) e chama o site (pg_net); o site envia as notificações.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Celulares/navegadores que aceitaram receber notificações
create table if not exists public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ativa boolean not null default true,   -- false = desligado ou celular que não existe mais
  criado_em timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_inscricoes' and policyname = 'push: ver as proprias') then
    create policy "push: ver as proprias" on public.push_inscricoes for select to authenticated using (usuario_id = auth.uid());
  end if;
end $$;
revoke all on public.push_inscricoes from anon;

-- Endereço do site, senha que o banco manda ao site e chaves do Web Push (VAPID).
-- A senha nasce aqui mesmo (aleatória) e as chaves são criadas pelo site no primeiro uso:
-- nenhum segredo fica nos arquivos do projeto. Sem acesso pelo app (RLS sem regras).
create table if not exists public.lembretes_config (
  id integer primary key default 1 check (id = 1),
  url text,
  segredo text,
  vapid_publica text,
  vapid_privada text
);
alter table public.lembretes_config add column if not exists vapid_publica text;
alter table public.lembretes_config add column if not exists vapid_privada text;
alter table public.lembretes_config enable row level security;
revoke all on public.lembretes_config from anon, authenticated;
insert into public.lembretes_config (id, segredo) values (1, encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;
update public.lembretes_config set segredo = encode(extensions.gen_random_bytes(32), 'hex') where id = 1 and segredo is null;

-- Confere a senha que chegou no site
create or replace function public._lembretes_conferir(p_segredo text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_segredo is null or p_segredo is distinct from (select segredo from public.lembretes_config where id = 1) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
end $$;
revoke execute on function public._lembretes_conferir(text) from public, anon, authenticated;

-- Chaves do Web Push: o site lê (com a senha) e grava na primeira vez
create or replace function public.lembretes_vapid(p_segredo text)
returns table (publica text, privada text) language plpgsql security definer set search_path = public as $$
begin
  perform public._lembretes_conferir(p_segredo);
  return query select c.vapid_publica, c.vapid_privada from public.lembretes_config c where c.id = 1;
end $$;

create or replace function public.lembretes_salvar_vapid(p_segredo text, p_publica text, p_privada text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._lembretes_conferir(p_segredo);
  update public.lembretes_config set vapid_publica = p_publica, vapid_privada = p_privada where id = 1 and vapid_publica is null;
end $$;

-- Só a chave pública (o celular precisa dela para ativar)
create or replace function public.lembretes_chave_publica()
returns text language sql stable security definer set search_path = public as $$
  select vapid_publica from public.lembretes_config where id = 1;
$$;

revoke execute on function public.lembretes_vapid(text) from public;
revoke execute on function public.lembretes_salvar_vapid(text, text, text) from public;
revoke execute on function public.lembretes_chave_publica() from public;
grant execute on function public.lembretes_vapid(text) to anon, authenticated;
grant execute on function public.lembretes_salvar_vapid(text, text, text) to anon, authenticated;
grant execute on function public.lembretes_chave_publica() to anon, authenticated;

-- Salvar / tirar o celular do usuário logado (um celular fica com quem ativou por último)
create or replace function public.salvar_inscricao_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_ativo() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  insert into public.push_inscricoes (usuario_id, endpoint, p256dh, auth, ativa)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, true)
  on conflict (endpoint) do update set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth, ativa = true, criado_em = now();
end $$;

create or replace function public.remover_inscricao_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  update public.push_inscricoes set ativa = false where endpoint = p_endpoint and usuario_id = auth.uid();
$$;

revoke execute on function public.salvar_inscricao_push(text, text, text) from public, anon;
revoke execute on function public.remover_inscricao_push(text) from public, anon;
grant execute on function public.salvar_inscricao_push(text, text, text) to authenticated;
grant execute on function public.remover_inscricao_push(text) to authenticated;

-- Quem recebe cada lembrete (o site chama com a senha)
create or replace function public.lembretes_destinatarios(p_segredo text, p_tipo text, p_usuario uuid default null)
returns table (endpoint text, p256dh text, auth text, nome text)
language plpgsql security definer set search_path = public as $$
begin
  perform public._lembretes_conferir(p_segredo);
  return query
    select i.endpoint, i.p256dh, i.auth, p.nome
      from public.push_inscricoes i
      join public.profiles p on p.id = i.usuario_id
     where i.ativa and p.ativo and p.funcao = 'eletricista'
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

-- Celulares que não existem mais (o serviço de notificações respondeu "não encontrado")
create or replace function public.lembretes_remover(p_segredo text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._lembretes_conferir(p_segredo);
  update public.push_inscricoes set ativa = false where endpoint = any (p_endpoints);
end $$;

revoke execute on function public.lembretes_destinatarios(text, text, uuid) from public;
revoke execute on function public.lembretes_remover(text, text[]) from public;
grant execute on function public.lembretes_destinatarios(text, text, uuid) to anon, authenticated;
grant execute on function public.lembretes_remover(text, text[]) to anon, authenticated;

-- Chama o site para mandar o lembrete (usado pelo pg_cron)
create or replace function public.disparar_lembrete(p_tipo text, p_usuario uuid default null)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.lembretes_config%rowtype;
begin
  select * into c from public.lembretes_config where id = 1;
  if c.url is null or c.segredo is null then return null; end if;
  return net.http_post(
    url := c.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || c.segredo),
    body := jsonb_build_object('tipo', p_tipo, 'usuario', p_usuario),
    timeout_milliseconds := 30000
  );
end $$;
revoke execute on function public.disparar_lembrete(text, uuid) from public, anon, authenticated;

-- "Enviar teste" no celular: o banco pede ao site uma notificação só para quem pediu
create or replace function public.pedir_lembrete_teste()
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_ativo() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  return public.disparar_lembrete('teste', auth.uid());
end $$;
revoke execute on function public.pedir_lembrete_teste() from public, anon;
grant execute on function public.pedir_lembrete_teste() to authenticated;

-- Horários (o pg_cron usa UTC; São Paulo = UTC−3, sem horário de verão)
select cron.schedule('lembrete-chegada-manha', '45 10 * * 1-6', $$select public.disparar_lembrete('chegada')$$);  -- 07:45
select cron.schedule('lembrete-saida-almoco',  '50 14 * * *',   $$select public.disparar_lembrete('saida')$$);    -- 11:50
select cron.schedule('lembrete-chegada-tarde', '45 16 * * 1-6', $$select public.disparar_lembrete('chegada')$$);  -- 13:45
select cron.schedule('lembrete-saida-tarde',   '45 20 * * *',   $$select public.disparar_lembrete('saida')$$);    -- 17:45
