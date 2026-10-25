-- Transforma um usuário já criado em ADMINISTRADOR.
-- 1) Crie o usuário em Authentication → Users → Add user → Create new user
--    (marque "Auto Confirm User").
-- 2) Troque o e-mail e o nome abaixo e rode no SQL Editor.

update public.profiles
set funcao = 'admin',
    ativo = true,
    nome = 'Seu Nome Aqui'
where email = 'seu-email@exemplo.com';

-- Confira: deve aparecer uma linha com funcao = admin
select id, nome, email, funcao, ativo from public.profiles where funcao = 'admin';
