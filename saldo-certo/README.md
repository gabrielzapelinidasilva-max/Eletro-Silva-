# Saldo Certo by Evom

**Seu dinheiro no lugar certo.** Um produto **Evom**. App web de controle financeiro pessoal: ganhos, gastos, gastos fixos
recorrentes, investimentos e um resumo mensal com o saldo final.

- **Stack:** Next.js 16 (App Router) + TypeScript · Tailwind CSS 4 + shadcn/ui + lucide-react · Recharts ·
  Zod + react-hook-form · Supabase (Postgres, Auth e `pg_cron`) com `@supabase/ssr` · Vercel
- **Idioma e formatos:** português do Brasil, valores em `R$ 1.234,56`, datas em `dd/mm/aaaa`,
  fuso `America/Sao_Paulo`.

## Telas

| Rota | O que faz |
|---|---|
| `/login`, `/cadastro`, `/esqueci-senha` | Entrar, criar conta e pedir o link de nova senha |
| `/redefinir-senha` | Escolher a nova senha (aberta pelo link do e-mail) |
| `/ganhos` | Entradas do mês (Salário, Freelance, Vendas, Outros), total e gráfico por categoria |
| `/gastos` | Gastos do mês, total e gráfico de pizza. Os lançados pelos gastos fixos aparecem com a etiqueta **Fixo** |
| `/gastos-fixos` | Contas recorrentes, próxima cobrança, total mensal comprometido e botão de pausar/reativar |
| `/investimentos` | Aportes e resgates, total do mês, saldo acumulado, carteira por tipo, projeção de rendimento e simulador |
| `/resumo` | Totais do mês, **saldo final** (verde/vermelho), gráfico dos últimos 12 meses e histórico |

O **seletor de mês** no topo filtra todas as abas. No celular as abas viram uma barra de navegação inferior.
Há modo claro e escuro (botão no topo; segue o sistema por padrão).

## Como rodar localmente

Pré-requisitos: Node.js 20.9+ e um projeto Supabase com a migração aplicada.

```bash
cd saldo-certo
npm install
cp .env.example .env.local   # preencha com a URL e a chave publicável do seu projeto
npm run dev                  # http://localhost:3000
```

Variáveis de ambiente (`.env.local`, que fica fora do git):

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → chave **publicável** (`sb_publishable_...`) |

> Nunca use a *service role key* no front-end. Toda a segurança vem do RLS do banco.

Outros comandos: `npm run build` (build de produção) e `npm run lint` (ESLint).

### Banco de dados

A migração fica em [`supabase/migrations`](supabase/migrations). Para aplicar num projeto novo:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Para regenerar os tipos TypeScript depois de mudar o banco:

```bash
npx supabase gen types typescript --project-id SEU_PROJECT_REF > src/types/database.ts
```

**Tabelas:** `incomes`, `expenses`, `fixed_expenses` e `investments`. Todas têm RLS ligado, e cada usuário só
lê, cria, edita e exclui as próprias linhas (`user_id = auth.uid()`). A view `monthly_summary`
(`security_invoker = true`, ou seja, respeita o RLS de quem consulta) devolve por usuário e mês:
`total_incomes`, `total_variable_expenses`, `total_fixed_expenses`, `total_invested` e `balance`.

**Saldo final do mês** = ganhos − gastos variáveis − gastos fixos − investimentos (aportes − resgates).

## Como funciona o desconto automático dos gastos fixos

Cada gasto fixo tem `start_date` (primeira cobrança), `next_charge_date` (próxima cobrança) e `active`.

1. **Ao cadastrar**, um trigger define `next_charge_date = start_date`. Se essa data já chegou (hoje ou no
   passado, no fuso de São Paulo), outro trigger chama a cobrança na hora e lança todas as cobranças
   vencidas.
2. **Todo dia às 03:00 de Brasília (06:00 UTC)** o `pg_cron` executa `process_fixed_expenses()`. Para
   cada gasto fixo **ativo** com `next_charge_date <= hoje`, a função:
   - insere um gasto em `expenses` com a mesma descrição, valor e categoria, `date = next_charge_date`,
     `fixed_expense_id` preenchido e `is_fixed = true`;
   - avança `next_charge_date` em **30 dias**;
   - repete enquanto ainda estiver atrasado. Assim, se o job ficar alguns dias sem rodar, nada se perde.
3. **Sem duplicidade:** o índice único `expenses(fixed_expense_id, date)` impede lançar a mesma cobrança
   duas vezes, mesmo que o job e o app rodem ao mesmo tempo. A linha do gasto fixo também é travada
   (`FOR UPDATE`) durante o processamento.
4. **Pausar/reativar:** um gasto pausado não é cobrado. Ao reativar, as datas que caíram durante a pausa
   são puladas, de 30 em 30 dias, até a próxima data igual ou posterior a hoje.
5. Esses lançamentos aparecem na aba **Gastos** com a etiqueta **Fixo** e entram como "gastos fixos" no
   **Resumo do Mês**, descontando do saldo final. Se o gasto fixo for excluído, os lançamentos antigos
   continuam lá como fixos (`is_fixed` não muda).

**Segurança:** `process_fixed_expenses()` e `charge_fixed_expense()` são `security definer` com
`search_path` fixo e **não** podem ser chamadas pelo app (`anon`/`authenticated`), só pelo banco. O usuário
também não consegue forjar `is_fixed`/`fixed_expense_id` nem mexer em `next_charge_date`, porque as
permissões são concedidas por coluna.

Para conferir o agendamento no SQL Editor do Supabase:

```sql
select jobname, schedule, active from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

## Rendimento dos investimentos

Ao cadastrar um **aporte**, dá para ligar "Calcular quanto vai render" e informar a **taxa de juros**
(ao mês ou ao ano) e o **prazo** (meses ou anos). Esses dados ficam nas colunas `rate`, `rate_period`
e `term_months` de `investments`. São opcionais, só valem para aportes e são obrigatórios em conjunto
(regra no banco). Com eles o app mostra:

- em cada aporte: o valor no fim do prazo, a data, e quanto ele vale **hoje** (estimado);
- o card **Rendimento estimado até hoje**, que soma os juros de todos os aportes com taxa;
- um gráfico de projeção mês a mês (botão de gráfico no aporte);
- o **Simulador de rendimento**, para testar qualquer valor, aporte mensal, taxa e prazo sem salvar nada.

O cálculo usa juros compostos. Uma taxa anual é convertida para a mensal equivalente,
`(1 + taxa)^(1/12) − 1`. Os valores são **brutos**: não descontam imposto de renda, IOF nem taxas.
A lógica fica em [`src/lib/yield.ts`](src/lib/yield.ts).

## Deploy (Vercel)

O projeto `saldo-certo` na Vercel usa `saldo-certo/` como *Root Directory*, com
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas em Production e Preview. No
Supabase, em **Authentication → URL Configuration**, a URL da Vercel deve estar em *Site URL* e em
*Redirect URLs* (com `/**` no fim) para os links de confirmação e de nova senha funcionarem.

## Estrutura

```
src/
  app/(auth)/        login, cadastro, esqueci-senha
  app/(app)/         layout autenticado + as 5 abas
  app/auth/callback  troca o código do e-mail por sessão
  components/ui/     componentes shadcn/ui
  components/app/    navegação, seletor de mês, formulários, gráficos
  lib/               Supabase, formatação (R$/datas), schemas Zod
  proxy.ts           protege as rotas (no Next 16 o middleware se chama proxy)
  types/database.ts  tipos gerados do banco
supabase/migrations/ SQL do banco
```
