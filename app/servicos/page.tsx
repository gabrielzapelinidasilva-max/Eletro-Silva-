import PageHeader from "@/components/PageHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import { FACEBOOK_SERVICOS, MSG } from "@/lib/site";

export const metadata = { title: "Serviços" };

const SERVICOS = [
  { icone: "🏠", titulo: "Instalações residenciais" },
  { icone: "🏢", titulo: "Instalações comerciais" },
  { icone: "🌾", titulo: "Instalações rurais" },
  { icone: "🛠️", titulo: "Manutenção elétrica" },
  { icone: "❄️", titulo: "Climatização" },
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
            {SERVICOS.map((s) => (
              <div key={s.titulo} className="card destaque">
                <span className="icone">{s.icone}</span>
                <h3>{s.titulo}</h3>
              </div>
            ))}
          </div>
          <div className="botoes centro">
            <WhatsAppButton texto={MSG.servico}>🔧 Pedir orçamento de serviço</WhatsAppButton>
          </div>
          <p className="centro">
            <a href={FACEBOOK_SERVICOS} target="_blank" rel="noopener">Veja nossos trabalhos no Facebook →</a>
          </p>
        </div>
      </section>
    </>
  );
}
