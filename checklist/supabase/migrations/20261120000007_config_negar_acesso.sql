-- Em Ordem: deixa explícito que ninguém (fora das funções internas) lê private.config
create policy "config: sem acesso pela API"
  on private.config for all to anon, authenticated
  using (false) with check (false);
