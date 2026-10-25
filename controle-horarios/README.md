# Eletro Silva – Controle de Horários

Aplicativo web para os **eletricistas** registrarem chegada, saída e o serviço feito em cada cliente, e para o **administrador** acompanhar e gerenciar tudo.

- Funciona no celular (feito primeiro para o celular) e no computador.
- Datas em dd/mm/aaaa, horas em 24h, fuso de São Paulo.
- Tecnologias: Next.js + Tailwind CSS, Supabase (banco de dados e login) e Vercel (hospedagem).

> Este app fica na pasta `controle-horarios/` do mesmo repositório do site da loja, mas é publicado **separado** (outro endereço). O site da loja não muda.

---

## O que cada pessoa vê

**Eletricista**
- "Olá, [nome]" e a data de hoje.
- **Registrar chegada**: a data e a hora atual já vêm preenchidas (dá para ajustar a hora). Informa o cliente.
- **Registrar saída**: a hora atual já vem preenchida. Informa o serviço realizado (obrigatório) e observações (opcional).
- **Meus registros**: histórico do mais recente para o mais antigo. Só os registros **de hoje** podem ser editados.
- Total de horas de hoje, da semana (a partir de segunda-feira) e do mês.

**Administrador** (três abas)
- **Resumo**: quem está trabalhando agora, horas da equipe no dia, na semana e no mês, e os últimos registros.
- **Registros**: todos os registros, com filtros (colaborador, período, cliente), busca por texto, detalhes, edição, exclusão (pede confirmação), total de horas por colaborador e botão **Exportar CSV/Excel**.
- **Colaboradores**: adicionar, editar, redefinir senha e ativar/desativar. Quem está desativado não consegue entrar, mas o histórico dele continua guardado.

**Segurança**: as regras ficam no próprio banco (Row Level Security). Mesmo que alguém tente acessar os dados "por fora", o eletricista só enxerga os próprios registros e só cria ou altera registros de hoje. Só o administrador vê e altera tudo.

---

## Passo a passo da instalação

Você vai precisar de:
- Uma conta no **Supabase** (grátis): https://supabase.com
- Uma conta na **Vercel** (grátis): https://vercel.com, entrando com a mesma conta do GitHub onde está este repositório.

### 1. Criar o projeto no Supabase

> Se você **já tem** um projeto Supabase para o site da loja, pode usar o mesmo. As tabelas deste app (`profiles` e `registros`) não interferem nas do site. Nesse caso pule para o passo 2.

1. Entre em https://supabase.com/dashboard e clique em **New project**.
2. Dê um nome (ex.: `eletro-silva`), crie uma senha forte para o banco (guarde-a) e escolha a região **South America (São Paulo)**.
3. Clique em **Create new project** e espere uns 2 minutos.

### 2. Criar as tabelas e as regras de segurança

1. No menu da esquerda do Supabase, clique em **SQL Editor** e depois em **New query**.
2. Abra o arquivo [`supabase/instalar-tudo.sql`](supabase/instalar-tudo.sql), copie **todo** o conteúdo, cole no editor e clique em **Run**. Deve aparecer "Success. No rows returned".

(Esse arquivo é a junção de `supabase/migrations/0001_tabelas.sql` e `0002_rls.sql`; se preferir, rode os dois separadamente, nessa ordem.)

Pode rodar de novo no futuro sem problema, porque não apaga dados.

### 3. Desligar o cadastro público

Só o administrador deve criar contas.

1. No Supabase, vá em **Authentication → Sign In / Providers** (em algumas versões: **Authentication → Providers → Email**).
2. **Desligue** a opção **Allow new users to sign up**.
3. Deixe o provedor **Email** ligado. Se quiser, desligue também **Confirm email** (as contas criadas pelo app já saem confirmadas).

### 4. Copiar as chaves do Supabase

Em **Project Settings → API** (ou **API Keys**), copie:

| O que | Onde usar |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| Chave **anon / publishable** (pública) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Chave **service_role / secret** (secreta) | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ A chave **service_role** dá acesso total ao banco. **Nunca** a mande por WhatsApp ou e-mail, nem a coloque no código. Ela só vai nas variáveis de ambiente da Vercel e no seu arquivo `.env.local`. O app usa essa chave apenas no servidor; ela nunca vai para o navegador.

### 5. Criar o primeiro administrador

Escolha **uma** das duas formas:

**Forma A: pelo painel do Supabase (sem instalar nada)**
1. Vá em **Authentication → Users → Add user → Create new user**.
2. Digite o e-mail e a senha do administrador, marque **Auto Confirm User** e clique em **Create user**. (Por segurança, contas criadas no painel começam desativadas; o passo seguinte ativa e transforma em administrador.)
3. Vá em **SQL Editor → New query**, cole o conteúdo de [`supabase/criar-admin.sql`](supabase/criar-admin.sql), **troque o e-mail e o nome** pelos seus e clique em **Run**. A última consulta deve mostrar uma linha com `funcao = admin`.

**Forma B: pelo computador (precisa ter feito o passo "Rodar no computador" abaixo)**
```bash
npm run criar-admin
```
O programa pergunta nome, e-mail e senha.

Depois disso, os outros colaboradores são criados **pelo próprio app**, na aba **Colaboradores**.

### 6. Publicar na Vercel

1. Entre em https://vercel.com/new e importe este repositório do GitHub.
2. Em **Root Directory**, clique em **Edit** e escolha a pasta **`controle-horarios`**. Esse passo é importante.
3. Abra **Environment Variables** e adicione as três variáveis do passo 4:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Deploy**. Em 1 ou 2 minutos você recebe um endereço como `https://eletro-silva-horarios.vercel.app`.
5. Abra o endereço, entre com o administrador e cadastre os eletricistas.

Dicas:
- Para usar um endereço próprio (ex.: `horarios.eletrosilva.com.br`), vá em **Settings → Domains** no projeto da Vercel.
- No celular, abra o endereço e use **"Adicionar à tela inicial"** para o app ficar com ícone, como um aplicativo.
- Se mudar uma variável na Vercel, vá em **Deployments** e clique em **Redeploy** para ela valer.

---

## Rodar no computador (opcional, para testar ou desenvolver)

1. Instale o **Node.js** (versão 20 ou mais nova): https://nodejs.org
2. Abra o terminal na pasta `controle-horarios` e rode:
   ```bash
   cp .env.example .env.local
   ```
3. Abra o arquivo `.env.local` num editor de texto e preencha as três variáveis do passo 4.
4. Instale e inicie:
   ```bash
   npm install
   npm run dev
   ```
5. Acesse http://localhost:3000

Outros comandos:
- `npm run build`: gera a versão de produção (o mesmo que a Vercel faz).
- `npm run lint`: confere os tipos do TypeScript.
- `npm run criar-admin`: cria ou promove um administrador.

---

## Dúvidas comuns

**Um eletricista esqueceu de registrar a saída ontem.**
Ele verá um aviso e não conseguirá registrar nova chegada até corrigir. O registro aparece no **Resumo** com um alerta amarelo. Na aba **Registros**, edite-o, preencha a saída e o serviço e salve.

**Como apagar um colaborador?**
Use **Desativar**. Assim ele não entra mais, mas as horas dele continuam nos relatórios. O banco não deixa apagar quem já tem registros, justamente para não perder o histórico.

**Esqueceram a senha.**
O administrador abre **Colaboradores → Senha** e define uma nova.

**Atendimento que passa da meia-noite.**
Cada registro vale para um único dia (a saída não pode ser antes da chegada). Registre a saída às 23:59 e uma nova chegada às 00:00 no dia seguinte.

**Como abrir o CSV no Excel?**
Basta dar dois cliques. O arquivo já sai no formato do Excel em português (separado por ponto e vírgula e com acentos corretos). Há uma coluna de horas em `h:mm` e outra em número decimal (ex.: `7,50`), para fazer contas.

---

## Estrutura do projeto

```
controle-horarios/
├── app/
│   ├── login/              tela de login
│   ├── eletricista/        área do eletricista (chegada, saída, meus registros)
│   ├── admin/              área do administrador
│   │   ├── page.tsx        aba Resumo
│   │   ├── registros/      aba Registros (+ exportar CSV)
│   │   └── colaboradores/  aba Colaboradores (usa a service role, só no servidor)
│   └── actions.ts          sair (logout)
├── components/             componentes reutilizáveis (botões, campos, modal, toasts...)
├── lib/                    Supabase, datas/fuso, cálculo de horas, validações, consultas
├── middleware.ts           protege as rotas conforme a função do usuário
├── supabase/
│   ├── migrations/         0001_tabelas.sql e 0002_rls.sql
│   └── criar-admin.sql     promove um usuário a administrador
└── scripts/criar-admin.mjs cria o primeiro administrador pelo terminal
```

### Banco de dados

**`profiles`**: um por usuário (ligado a `auth.users`)
`id, nome, email, telefone, funcao ('admin' | 'eletricista'), ativo, criado_em`

**`registros`**
`id, usuario_id, data, hora_chegada, hora_saida, cliente, servico, observacoes, minutos_trabalhados, criado_em, atualizado_em`

- `minutos_trabalhados` é calculado automaticamente pelo banco a partir de chegada e saída.
- O banco recusa saída antes da chegada e saída sem serviço.
- Cada colaborador só pode ter um registro em aberto (sem saída) por vez.
- A função do usuário vem de `app_metadata`, que só o servidor consegue definir, então ninguém vira administrador sozinho.
