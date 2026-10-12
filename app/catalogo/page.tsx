import PageHeader from "@/components/PageHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getProdutos } from "@/lib/data";
import { CATEGORIAS, MSG } from "@/lib/site";

export const metadata = { title: "Catálogo" };
export const revalidate = 300;

export default async function Catalogo() {
  const produtos = await getProdutos();

  return (
    <>
      <PageHeader
        titulo="Catálogo"
        subtitulo="Encontre o que precisa e peça seu orçamento direto pelo WhatsApp."
      />
      <section className="secao">
        <div className="container">
          <nav className="categorias" aria-label="Categorias">
            {CATEGORIAS.map((c) => (
              <a key={c.slug} href={`#${c.slug}`} className="categoria-chip">
                {c.nome}
              </a>
            ))}
          </nav>

          {CATEGORIAS.map((c) => {
            const itens = produtos.filter((p) => p.categoria === c.slug);
            return (
              <div key={c.slug} id={c.slug} className="categoria-bloco">
                <h2>{c.nome}</h2>
                {itens.length === 0 ? (
                  <div className="card produto-vazio">
                    <p>Temos variedade de {c.nome.toLowerCase()} na loja. Fale com a gente e peça seu orçamento.</p>
                    <WhatsAppButton texto={`Olá! Gostaria de um orçamento de ${c.nome.toLowerCase()}.`}>
                      Pedir orçamento
                    </WhatsAppButton>
                  </div>
                ) : (
                  <div className="grid-produtos">
                    {itens.map((p) => (
                      <article key={p.id} className="card produto">
                        {p.imagem_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagem_url} alt={p.nome} loading="lazy" />
                        ) : (
                          <div className="produto-img-vazia" aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo-branco.webp" alt="" width={440} height={170} />
                          </div>
                        )}
                        <h3>{p.nome}</h3>
                        {p.descricao && <p>{p.descricao}</p>}
                        <WhatsAppButton texto={`Olá! Gostaria de um orçamento de: ${p.nome}.`}>
                          Pedir orçamento
                        </WhatsAppButton>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="card centro chamada">
            <p>Não encontrou o que procura? A loja tem muito mais.</p>
            <WhatsAppButton texto={MSG.orcamento}>Fale no WhatsApp</WhatsAppButton>
          </div>
        </div>
      </section>
    </>
  );
}
