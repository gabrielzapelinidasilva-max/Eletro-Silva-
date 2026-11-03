import { Clock, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import VideoVertical from "@/components/VideoVertical";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ENDERECO, HORARIOS, MAPS_LINK, MSG, VIDEO_TOUR_LOJA } from "@/lib/site";

export const metadata = { title: "Conheça a Loja" };

export default function ConhecaALoja() {
  return (
    <>
      <PageHeader
        titulo="Conheça a Loja"
        subtitulo="Um espaço completo, organizado e pronto para te atender. Dê uma olhada antes de vir!"
      />
      <section className="secao">
        <div className="container midia-grid">
          <VideoVertical src={VIDEO_TOUR_LOJA} capa="/videos/tour-loja-capa.webp" titulo="Tour pela loja Eletro Silva" />
          <div className="midia-texto">
            <h2>Faça um tour pela loja</h2>
            <p>
              Iluminação, lustres e pendentes, materiais elétricos, ferramentas e muito mais: são mais de 3.000 itens em
              estoque em um espaço pensado para você encontrar tudo o que precisa.
            </p>

            <div className="card loja-info">
              <p>
                <MapPin size={20} aria-hidden /> {ENDERECO}
              </p>
              <ul>
                {HORARIOS.map((h) => (
                  <li key={h.dia}>
                    <Clock size={18} aria-hidden />
                    <span>
                      <strong>{h.dia}:</strong> {h.hora}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="botoes">
              <a className="btn btn-primario" href={MAPS_LINK} target="_blank" rel="noopener">
                <MapPin size={20} aria-hidden /> Como chegar
              </a>
              <WhatsAppButton texto={MSG.orcamento}>Fale no WhatsApp</WhatsAppButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
