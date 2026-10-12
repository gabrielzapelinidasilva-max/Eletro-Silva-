import PageHeader from "@/components/PageHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import { brl, getOfertas, getSorteioAtual } from "@/lib/data";
import { INSTAGRAM, MSG } from "@/lib/site";

export const metadata = { title: "Ofertas e Sorteios" };
export const revalidate = 300;

function dataBR(d: string) {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

export default async function Ofertas() {
  const [ofertas, sorteio] = await Promise.all([getOfertas(), getSorteioAtual()]);

  return (
    <>
      <PageHeader titulo="Ofertas e Sorteios" />

      <section className="secao">
        <div className="container">
          <h2>🔥 Ofertas da Semana</h2>
          <p>Preços especiais por tempo limitado, enquanto durar o estoque!</p>
          {ofertas.length === 0 ? (
            <div className="card">
              <p>As ofertas desta semana estão chegando. Entre na lista do WhatsApp para recebê-las primeiro.</p>
            </div>
          ) : (
            <div className="grid-produtos">
              {ofertas.map((o) => (
                <article key={o.id} className="card produto oferta">
                  {o.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.imagem_url} alt={o.titulo} loading="lazy" />
                  ) : (
                    <div className="produto-img-vazia" aria-hidden>🔥</div>
                  )}
                  <h3>{o.titulo}</h3>
                  {o.descricao && <p>{o.descricao}</p>}
                  <p className="preco">
                    {o.preco_de != null && <s>{brl(o.preco_de)}</s>}{" "}
                    {o.preco_por != null && <strong>{brl(o.preco_por)}</strong>}
                  </p>
                  {o.valido_ate && <p className="validade">Válido até {dataBR(o.valido_ate)}</p>}
                  <WhatsAppButton texto={`Olá! Tenho interesse na oferta: ${o.titulo}.`}>Quero essa oferta</WhatsAppButton>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container estreito">
          <h2>🎁 Sorteios</h2>
          <p>
            Siga{" "}
            <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener">
              <strong>@{INSTAGRAM}</strong>
            </a>{" "}
            no Instagram para participar e não perder nenhum.
          </p>

          <div className="card regulamento">
            <h3>Regulamento do sorteio atual</h3>
            {sorteio ? (
              <>
                <p><strong>{sorteio.titulo}</strong>{sorteio.data_sorteio && ` · Sorteio em ${dataBR(sorteio.data_sorteio)}`}</p>
                <div className="regulamento-texto">{sorteio.regulamento}</div>
              </>
            ) : (
              <p>Nenhum sorteio em andamento no momento. Fique de olho no nosso Instagram!</p>
            )}
          </div>

          <div className="botoes centro">
            <WhatsAppButton texto={MSG.ofertas}>📲 Quero receber ofertas no WhatsApp</WhatsAppButton>
          </div>
        </div>
      </section>
    </>
  );
}
