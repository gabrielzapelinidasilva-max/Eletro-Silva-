import Link from "next/link";
import { ArrowRight, CalendarCheck, Flame, LayoutGrid, MessageCircle, Truck, Wrench } from "lucide-react";
import WhatsAppButton from "@/components/WhatsAppButton";
import { CATEGORIAS, MSG } from "@/lib/site";

const DESTAQUES = [
  { Icone: CalendarCheck, titulo: "Desde 2012", texto: "Mais de 14 anos cuidando da parte elétrica da região." },
  { Icone: Wrench, titulo: "Venda e instalação", texto: "O material certo e a equipe para instalar." },
  { Icone: Truck, titulo: "Entregamos em Braço do Norte e região", texto: "Faça seu orçamento pelo WhatsApp." },
];

export default function Inicio() {
  return (
    <>
      <section className="hero">
        <div className="container hero-conteudo">
          <h1>Tudo em material elétrico, aqui em Braço do Norte.</h1>
          <p className="hero-sub">
            Do fio à iluminação, com atendimento de quem entende, para sua casa, obra ou empresa.
          </p>
          <div className="botoes centro">
            <WhatsAppButton texto={MSG.orcamento}>
              <MessageCircle size={20} aria-hidden /> Fale no WhatsApp
            </WhatsAppButton>
            <Link className="btn btn-primario" href="/catalogo">
              <LayoutGrid size={20} aria-hidden /> Ver Catálogo
            </Link>
            <Link className="btn btn-secundario" href="/ofertas">
              <Flame size={20} aria-hidden /> Ofertas da Semana
            </Link>
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="container grid-3">
          {DESTAQUES.map(({ Icone, titulo, texto }) => (
            <div key={titulo} className="card destaque">
              <span className="icone-circulo" aria-hidden>
                <Icone size={28} strokeWidth={2} />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container centro-bloco">
          <h2>O que você encontra na loja</h2>
          <div className="categorias centro">
            {CATEGORIAS.map((c) => (
              <Link key={c.slug} href={`/catalogo#${c.slug}`} className="categoria-chip">
                {c.nome}
              </Link>
            ))}
          </div>
          <Link className="link-seta" href="/catalogo">
            Ver catálogo completo <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
