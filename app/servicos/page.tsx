import PageHeader from "@/components/PageHeader";
import { Building2, Home, Snowflake, Tractor, Wrench } from "lucide-react";
import WhatsAppButton from "@/components/WhatsAppButton";
import { FACEBOOK_SERVICOS, MSG } from "@/lib/site";

export const metadata = { title: "Serviços" };

const SERVICOS = [
  { Icone: Home, titulo: "Instalações residenciais" },
  { Icone: Building2, titulo: "Instalações comerciais" },
  { Icone: Tractor, titulo: "Instalações rurais" },
  { Icone: Wrench, titulo: "Manutenção elétrica" },
  { Icone: Snowflake, titulo: "Climatização" },
];

export default function Servicos() {
  return (
    <>
      <PageHeader
        titulo="Serviços"
        subtitulo="Além da loja, a Eletro Silva conta com equipe para instalações elétricas residenciais, comerciais e rurais, manutenção e climatização."
      />
      <section className="secao">
        <div className="container">
          <div className="grid-servicos">
            {SERVICOS.map(({ Icone, titulo }) => (
              <div key={titulo} className="card destaque">
                <span className="icone-circulo" aria-hidden>
                  <Icone size={28} strokeWidth={2} />
                </span>
                <h3>{titulo}</h3>
              </div>
            ))}
          </div>
          <div className="botoes centro">
            <WhatsAppButton texto={MSG.servico}>Pedir orçamento de serviço</WhatsAppButton>
          </div>
          <p className="centro">
            <a href={FACEBOOK_SERVICOS} target="_blank" rel="noopener">Veja nossos trabalhos no Facebook →</a>
          </p>
        </div>
      </section>
    </>
  );
}
