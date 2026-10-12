# Eletro Silva Materiais Elétricos — site

Site em Next.js, hospedado na **Vercel**, com catálogo, ofertas, sorteio e formulário de fornecedores no **Supabase**.

Páginas: Início · Quem Somos · Conheça a Loja · Serviços · Catálogo · Ofertas e Sorteios · Fornecedores · Contato.
Todos os botões de WhatsApp usam (48) 99814-9358 com mensagem pronta.

## 1. Supabase (uma vez)

1. No painel do projeto: **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique **Run**.
   Isso cria as tabelas `produtos`, `ofertas`, `sorteios`, `fornecedores_contatos`, as regras de segurança e o bucket `imagens`.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

## 2. Vercel (uma vez)

1. **Add New → Project** e importe este repositório do GitHub.
2. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon public
3. **Deploy**. Para usar domínio próprio: **Settings → Domains**.

Sem as variáveis o site funciona, mas o catálogo mostra só as categorias e o formulário de fornecedores pede para usar o WhatsApp.

## Atualizando o conteúdo (pelo painel do Supabase → Table Editor)

| O que | Tabela | Dica |
|---|---|---|
| Produtos do catálogo | `produtos` | `categoria` usa o código: `fios-e-cabos`, `disjuntores-e-quadros`, `tomadas-e-interruptores`, `iluminacao-e-led`, `eletrodutos-e-conexoes`, `ferramentas-e-epis`, `ventiladores-e-chuveiros`. Desmarque `ativo` para esconder. |
| Ofertas da Semana | `ofertas` | Preencha `valido_ate`: a oferta some sozinha depois dessa data. |
| Regulamento do sorteio | `sorteios` | O site mostra o mais recente com `ativo` marcado. |
| Contatos de fornecedores | `fornecedores_contatos` | Chegam aqui pelo formulário. |
| Fotos | Storage → bucket `imagens` | Suba a foto, copie a URL pública e cole em `imagem_url`. |

O site atualiza catálogo e ofertas a cada 5 minutos.

## Vídeos, links e dados fixos

Ficam em `lib/site.ts`:
- `VIDEO_QUEM_SOMOS` e `VIDEO_TOUR_LOJA`: cole o link de incorporação do YouTube (`https://www.youtube.com/embed/ID`) ou de um `.mp4`. Vazio = espaço "vídeo em breve".
- `FACEBOOK_MATERIAIS`: link da página de materiais para o rodapé (hoje aponta para a eletrosilvaoficial).
- Telefones, horário, endereço e mensagens do WhatsApp.

## Rodando localmente

```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # http://localhost:3000
```
