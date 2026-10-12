import PageHeader from "@/components/PageHeader";
import Video from "@/components/Video";
import { VIDEO_QUEM_SOMOS } from "@/lib/site";

export const metadata = { title: "Quem Somos" };

export default function QuemSomos() {
  return (
    <>
      <PageHeader titulo="Quem Somos" />
      <section className="secao">
        <div className="container estreito">
          <p className="texto-grande">
            Desde 2012, a Eletro Silva atende Braço do Norte e região com materiais elétricos de qualidade e serviço
            de confiança. A empresa nasceu do trabalho com instalação e manutenção elétrica e cresceu para oferecer
            também uma loja completa. Por isso entendemos de verdade o que cada cliente precisa: além de vender o
            produto certo, sabemos como ele deve ser instalado.
          </p>
          <Video src={VIDEO_QUEM_SOMOS} titulo="Quem Somos" />
        </div>
      </section>
    </>
  );
}
