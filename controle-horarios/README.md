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
- **Registrar saída**: a hora atual já vem preenchida. Informa o serviço realizado (obrigatório), observações (opcional) e o **carro usado e os km rodados**. Ao salvar, o serviço entra **sozinho** na aba Gastos do administrador, já com a mão de obra e a gasolina calculadas. O eletricista **não vê nem informa valores** (material e valor cobrado): isso é só do administrador.
- **Meus registros**: histórico do mais recente para o mais antigo. Só os registros **de hoje** podem ser editados.
- Na saída, a parte **Fotos e assinatura do cliente (opcional)**: fotos do **antes** e do **depois** (até 6 de cada, tiradas na hora ou da galeria) e a **assinatura do cliente** com o dedo na tela, mais o nome de quem assinou.
- **Minha agenda**: os serviços agendados para ele nos próximos 30 dias, com botões para ver o endereço no mapa, ligar para o cliente e **Iniciar** (já preenche o cliente na chegada).
- Enquanto está com um serviço em aberto e o app aberto, o celular envia a **localização** para o administrador (o aparelho pede permissão).
- Total de horas de hoje, da semana (a partir de segunda-feira) e do mês.

**Administrador** (seis abas)
- **Resumo**: quem está trabalhando agora (com a **localização** de cada um: há quanto tempo foi atualizada, "Abrir no mapa" e "Ver aqui"), horas da equipe no dia, na semana e no mês, e os últimos registros.
- **Registros**: todos os registros, com filtros (colaborador, período, cliente), busca por texto, detalhes, edição, exclusão (pede confirmação), total de horas por colaborador e botão **Exportar CSV/Excel**.
- **Histórico**: a base com **todos os trabalhos já feitos**, desde o primeiro registro, organizados por mês e dia, com o serviço e as observações completos. Tem busca, filtro por colaborador, cliente e período, exportação, e a visão **Por cliente** (quantas vezes cada cliente foi atendido, total de horas, primeira e última visita e quem atendeu; toque no cliente para ver todos os trabalhos dele). Em Por cliente, o botão com a **flechinha** em "Tempo sem serviço" ordena por quem está há **mais** ou **menos** tempo sem serviço, e os filtros "+30 / +60 / +90 / +180 / +365 dias" mostram só os clientes parados há mais tempo.
- **Agenda**: calendário do ano para agendar serviços (data, hora, cliente, endereço, telefone, serviço, eletricista). Para **trocar de dia**, arraste o serviço para outro dia (no computador) ou use **Mover** (escolher a data, Amanhã, +1 semana). Dá para marcar como concluído ou cancelado. No celular aparece em lista.
- **Gastos**: ganhos, gastos e lucro de cada serviço, **automático**: cada serviço que o eletricista registra (com horas, carro e km) aparece aqui sozinho, marcado como "automático", e continua ligado ao registro (se o eletricista ou o admin editar o registro, os gastos se atualizam; se o registro for excluído, os gastos saem junto). A conta é: **ganhos = valor do serviço + material + mão de obra** (horas × valor da hora; material e mão de obra são nossos, entram como ganho); **gastos = gasolina** (km ÷ km/l do carro × preço do litro); **lucro = ganhos − gastos** e **% de lucro = lucro ÷ ganhos**. O administrador completa o **valor do material** e o **valor cobrado** de cada serviço (aviso "Falta completar os valores" e botão **Completar**; também dá para preencher ao editar o registro na aba Registros). O banco garante que só o administrador altera esses valores. Também dá para fazer um **lançamento avulso** (serviço sem registro de eletricista). Em **Valores usados nas contas**, o administrador muda o preço da gasolina (começa em R$ 6,39), o valor da hora e a lista de carros (Celta 11 km/l, Uno branco 12, Fiorino 10, Saveiro 10, Hilux 8; dá para editar, adicionar e tirar da lista). Cada lançamento guarda o preço da gasolina, o consumo do carro e o valor da hora do dia, então mudar esses valores não altera os serviços antigos. Cada serviço de eletricista tem o botão **Imprimir nota** (nota de serviço pronta para imprimir ou salvar em PDF, com fotos e assinatura).
- **Gastos fixos por mês** (dentro de Gastos): salários, ferramentas, manutenção do carro e outros. No **último dia de cada mês** eles são descontados automaticamente do lucro daquele mês (Lucro dos serviços − Gastos fixos = **Lucro final**). O administrador edita a lista quando quiser, pausa um item e também ajusta os valores de um mês já fechado (sem mudar os outros meses).
- **Lixeira** (botão no topo de Registros e de Gastos): tudo o que o administrador exclui (serviço de eletricista ou lançamento avulso) vai para a lixeira e pode ser **restaurado por 30 dias**, voltando exatamente como era (inclusive para o eletricista). Depois de 30 dias some sozinho; também dá para excluir de vez ou esvaziar a lixeira.
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

(Esse arquivo é a junção dos três arquivos de `supabase/migrations/`; se preferir, rode-os separadamente, em ordem.)

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
| Chave **service_role / secret** (secreta, **opcional**) | `SUPABASE_SERVICE_ROLE_KEY` |

A chave **service_role** é **opcional**: sem ela, o app gerencia os colaboradores pelas funções seguras do banco (`admin_*`, que conferem se quem pediu é administrador). Com ela, usa a API oficial de administração do Supabase.

⚠️ Se usar a chave **service_role**, lembre que ela dá acesso total ao banco. **Nunca** a mande por WhatsApp ou e-mail, nem a coloque no código. Ela só vai nas variáveis de ambiente da Vercel e no seu arquivo `.env.local`. O app usa essa chave apenas no servidor; ela nunca vai para o navegador.

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
3. Abra **Environment Variables** e adicione as variáveis do passo 4:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opcional)
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
│   │   ├── historico/      aba Histórico (todos os trabalhos, por data ou por cliente)
│   │   ├── agenda/         aba Agenda (calendário do ano, arrastar para trocar de dia)
│   │   ├── gastos/         aba Gastos (lucro por serviço, gastos fixos por mês, valores usados)
│   │   ├── nota/[id]/      nota de serviço para imprimir
│   │   ├── arquivo/        abre fotos e assinaturas (link temporário, só admin)
│   │   └── colaboradores/  aba Colaboradores (usa a service role, só no servidor)
│   └── actions.ts          sair (logout)
├── components/             componentes reutilizáveis (botões, campos, modal, toasts...)
├── lib/                    Supabase, datas/fuso, cálculo de horas, validações, consultas
├── middleware.ts           protege as rotas conforme a função do usuário
├── supabase/
│   ├── migrations/         0001 a 0012 (rodar na ordem)
│   ├── instalar-tudo.sql   todas as migrations juntas (colar no SQL Editor)
│   └── criar-admin.sql     promove um usuário a administrador
└── scripts/criar-admin.mjs cria o primeiro administrador pelo terminal
```

### Banco de dados

**`profiles`**: um por usuário (ligado a `auth.users`)
`id, nome, email, telefone, funcao ('admin' | 'eletricista'), ativo, criado_em`

**`configuracoes`** (preço da gasolina e valor da hora), **`veiculos`** (carros e km/l) e **`custos_servico`** (lançamentos de gastos): só o administrador acessa.

**`gastos_fixos`**, **`gastos_fixos_mes`** e **`meses_fechados`** (gastos fixos e fechamento de cada mês), **`agendamentos`** (agenda), **`lixeira`**: só o administrador acessa (o eletricista vê só os próprios agendamentos). **`localizacoes`**: a última posição de cada colaborador. Fotos e assinaturas ficam no Storage, no bucket privado `servicos`.

**`registros`**
`id, usuario_id, data, hora_chegada, hora_saida, cliente, servico, observacoes, minutos_trabalhados, criado_em, atualizado_em`

- `minutos_trabalhados` é calculado automaticamente pelo banco a partir de chegada e saída.
- O banco recusa saída antes da chegada e saída sem serviço.
- Cada colaborador só pode ter um registro em aberto (sem saída) por vez.
- A função do usuário vem de `app_metadata`, que só o servidor consegue definir, então ninguém vira administrador sozinho.
