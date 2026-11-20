# Em Ordem — checklists da equipe

App de checklists com login, papéis (admin / colaborador), tempo real e histórico.
Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth, Postgres com RLS, Realtime, Edge Function), publicado na Vercel.

- Supabase: projeto **em-ordem** (`dafrspmeymisuwdqbtvk`, São Paulo). É separado do projeto da loja/horários.
- Vercel: projeto **em-ordem**, com Root Directory = `checklist`.

## Papéis

| | Admin | Colaborador |
|---|---|---|
| Ver checklists | todos (inclusive arquivados) | só os atribuídos a ele (como responsável do checklist ou de algum item) |
| Marcar/desmarcar itens e comentar | ✔ | ✔ (nos que pode ver) |
| Criar / editar / arquivar / excluir checklists e itens, reordenar | ✔ | ✘ |
| Modelos | ✔ | ✘ |
| Área de usuários (convidar, mudar papel, desativar, remover) | ✔ | ✘ |

O admin principal (`gabrielzapelinidasilva@gmail.com`, marcado como `is_owner`) não pode ser rebaixado, desativado nem removido, nem por outro admin, nem por SQL direto (há um gatilho no banco).

## Segurança

- **RLS em todas as tabelas.** As regras estão no banco (`supabase/migrations/…_rls.sql`), não só na tela.
- Funções auxiliares no schema `private`, que não é exposto pela API: `is_admin()`, `is_ativo()`, `is_membro()`, `pode_ver_checklist()`, `pode_ver_item()`.
- Colaborador só consegue alterar `concluido` e `comentario` de um item. "Quem concluiu" e "quando" são gravados pelo banco.
- **Ninguém se cadastra sozinho.** O banco recusa a criação de contas cujo e-mail não esteja em `convites` (exceto o admin principal).
- A **SERVICE_ROLE_KEY** fica só dentro da Edge Function `admin-usuarios` (Supabase injeta a chave). Ela não vai para a Vercel nem para o navegador. As Server Actions de `app/(app)/admin/usuarios/actions.ts` conferem se quem chamou é admin e chamam a função, que confere de novo.
- `middleware.ts`: quem não está logado vai para `/login`; colaborador não entra em `/admin`; conta desativada é deslogada.

## Estrutura

```
checklist/
  app/(auth)/        login, esqueci-senha, auth/confirmar, definir-senha
  app/(app)/         painel, checklists/[id], admin/{checklists/novo, modelos, usuarios}
  supabase/migrations/   SQL versionado (já aplicado no projeto)
  supabase/functions/admin-usuarios/   Edge Function (convites e papéis)
```

## Variáveis de ambiente (Vercel)

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dafrspmeymisuwdqbtvk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável (`sb_publishable_…`) |
| `NEXT_PUBLIC_SITE_URL` | endereço do site, ex.: `https://em-ordem.vercel.app` |

## Convidando pessoas

1. Entre como admin → **Usuários** → **Convidar pessoa**.
2. Informe nome, e-mail e escolha **Colaborador** ou **Admin**.
3. Se o e-mail sair, a pessoa recebe o convite, clica no link e cria a senha.
   Se não sair (o envio padrão do Supabase só entrega para e-mails da equipe do projeto Supabase), aparece um **link de convite** para você copiar ou mandar por WhatsApp.
4. Para quem perdeu o e-mail ou esqueceu a senha: na lista, botão **Link de acesso**.

## Rodando localmente

```bash
cd checklist
cp .env.example .env.local
npm install
npm run dev
```
