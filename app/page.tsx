import Link from "next/link";
import WhatsAppButton from "@/components/WhatsAppButton";
import { CATEGORIAS, MSG } from "@/lib/site";

export default function Inicio() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Tudo em material elétrico, aqui em Braço do Norte.</h1>
          <p className="hero-sub">
            Do fio à iluminação, com atendimento de quem entende, para sua casa, obra ou empresa.
          </p>
          <div className="botoes">
            <WhatsAppButton texto={MSG.orcamento}>🟢 Fale no WhatsApp</WhatsAppButton>
            <Link className="btn btn-primario" href="/catalogo">📦 Ver Catálogo</Link>
            <Link className="btn btn-secundario" href="/ofertas">🔥 Ofertas da Semana</Link>
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="container grid-3">
          <div className="card destaque">
            <span className="icone">⚡</span>
            <h3>Desde 2012</h3>
            <p>Mais de 14 anos cuidando da parte elétrica da região.</p>
          </div>
          <div className="card destaque">
            <span className="icone">🔧</span>
            <h3>Venda e instalação</h3>
            <p>O material certo e a equipe para instalar.</p>
          </div>
          <div className="card destaque">
            <span className="icone">🚚</span>
            <h3>Entregamos em Braço do Norte e região</h3>
            <p>Faça seu orçamento pelo WhatsApp.</p>
          </div>
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container">
          <h2>O que você encontra na loja</h2>
          <div className="categorias">
            {CATEGORIAS.map((c) => (
              <Link key={c.slug} href={`/catalogo#${c.slug}`} className="categoria-chip">
                <span aria-hidden>{c.icone}</span> {c.nome}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
