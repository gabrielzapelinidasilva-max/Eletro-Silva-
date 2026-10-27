-- Eletro Silva – Controle de Horários
-- Etapa 9: fotos do antes/depois e assinatura do cliente (opcionais) ao finalizar o serviço.
-- Os arquivos ficam no Storage privado "servicos", na pasta do eletricista (id do usuário).

alter table public.registros add column if not exists fotos_antes text[] not null default '{}';
alter table public.registros add column if not exists fotos_depois text[] not null default '{}';
alter table public.registros add column if not exists assinatura text;        -- caminho da imagem no Storage
alter table public.registros add column if not exists assinatura_nome text check (assinatura_nome is null or char_length(assinatura_nome) <= 120);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('servicos', 'servicos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuário ativo envia arquivos só para a própria pasta; o admin vê todos.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'servicos: enviar na propria pasta') then
    create policy "servicos: enviar na propria pasta" on storage.objects for insert to authenticated
      with check (bucket_id = 'servicos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_ativo());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'servicos: ver os proprios ou admin') then
    create policy "servicos: ver os proprios ou admin" on storage.objects for select to authenticated
      using (bucket_id = 'servicos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'servicos: apagar os proprios ou admin') then
    create policy "servicos: apagar os proprios ou admin" on storage.objects for delete to authenticated
      using (bucket_id = 'servicos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
  end if;
end $$;
