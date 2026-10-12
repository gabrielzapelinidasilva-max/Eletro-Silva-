import PageHeader from "@/components/PageHeader";
import Video from "@/components/Video";
import { MAPS_LINK, VIDEO_TOUR_LOJA } from "@/lib/site";

export const metadata = { title: "Conheça a Loja" };

export default function ConhecaALoja() {
  return (
    <>
      <PageHeader
        titulo="Conheça a Loja"
        subtitulo="Um espaço completo, organizado e pronto para te atender. Dê uma olhada antes de vir!"
      />
      <section className="secao">
        <div className="container estreito">
          <Video src={VIDEO_TOUR_LOJA} titulo="Tour pela loja" />
          <div className="botoes centro">
            <a className="btn btn-primario" href={MAPS_LINK} target="_blank" rel="noopener">📍 Como chegar</a>
          </div>
        </div>
      </section>
    </>
  );
}
