import {
  Boxes,
  Cable,
  CheckCircle2,
  Cpu,
  Factory,
  Lightbulb,
  ShieldCheck,
  ToggleRight,
  Wrench,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Video from "@/components/Video";
import WhatsAppButton from "@/components/WhatsAppButton";
import { MSG, VIDEO_QUEM_SOMOS } from "@/lib/site";

export const metadata = { title: "Quem Somos" };

const LINHAS = [
  { Icone: Boxes, titulo: "Infraestrutura Elétrica", itens: ["Eletrodutos PVC e PEAD", "Caixas de luz", "Canaletas", "Perfilados e eletrocalhas", "Acessórios para instalação"] },
  { Icone: Cable, titulo: "Fios e Cabos", itens: ["Cabos flexíveis", "Cabos rígidos", "Cabos PP", "Cabos coaxiais", "Cabos para rede e internet"] },
  { Icone: ShieldCheck, titulo: "Proteção e Distribuição", itens: ["Disjuntores", "Quadros de distribuição", "DPS e DR", "Componentes para proteção elétrica"] },
  { Icone: ToggleRight, titulo: "Acabamentos Elétricos", itens: ["Tomadas", "Interruptores", "Placas", "Dimmers", "Módulos de comando"] },
  { Icone: Lightbulb, titulo: "Iluminação", itens: ["Lâmpadas e painéis de LED", "Plafons e refletores", "Fitas LED", "Luminárias", "Lustres decorativos"] },
  { Icone: Cpu, titulo: "Automação e Comunicação", itens: ["Sensores de presença", "Interfones", "Campainhas", "Automação residencial", "Soluções para casas inteligentes"] },
  { Icone: Wrench, titulo: "Ferramentas e EPIs", itens: ["Alicates e chaves de fenda", "Multímetros", "Fitas isolantes e de autofusão", "Escadas", "Equipamentos de proteção"] },
  { Icone: Factory, titulo: "Automação Industrial", itens: ["Soluções para acionamentos, comandos elétricos, proteção e automação de processos industriais"] },
];

const FOTOS = [
  { src: "/fotos/iluminacao-led.webp", legenda: "Iluminação LED" },
  { src: "/fotos/materiais-eletricos.webp", legenda: "Materiais Elétricos" },
  { src: "/fotos/lustres-pendentes.webp", legenda: "Lustres e Pendentes" },
];

const SERVICOS = [
  "Instalações elétricas residenciais, comerciais e industriais",
  "Manutenções elétricas",
  "Montagem de quadros elétricos",
  "Automação industrial",
];

const DIFERENCIAIS = [
  "Atendimento próximo e humanizado",
  "Equipe técnica especializada",
  "Levantamento completo de materiais",
  "Engenharia qualificada para apoiar seu projeto",
  "Entregas rápidas em toda a região",
  "Parceria com eletricistas, construtoras e indústrias",
  "Foco em segurança, economia e eficiência",
  "Produtos de qualidade e orientação técnica",
  "Compromisso com resultados e relacionamentos duradouros",
];

export default function QuemSomos() {
  return (
    <>
      <PageHeader
        titulo="Quem Somos"
        subtitulo="Soluções completas em materiais elétricos, iluminação, automação industrial e serviços especializados."
      />

      <section className="secao">
        <div className="container qs-intro">
          <div className="qs-foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fotos/fachada.webp" alt="Fachada da loja Eletro Silva em Braço do Norte" width={551} height={721} />
            <div className="qs-selo">
              <small>Mais de</small>
              <strong>20</strong>
              <small>anos de experiência</small>
            </div>
          </div>
          <div className="qs-texto">
            <h2>Nossa história</h2>
            <p>
              A Eletro Silva Materiais Elétricos nasceu da experiência e da parceria entre os irmãos Cléio e Paulinho,
              profissionais que atuam há mais de 20 anos no setor elétrico. Com uma trajetória marcada pela qualidade dos
              serviços prestados e pela confiança conquistada junto aos clientes, decidiram unir conhecimento técnico e
              visão empreendedora em um novo projeto.
            </p>
            <p>
              Fundada em 23 de novembro de 2024, em Braço do Norte (SC), a Eletro Silva Materiais Elétricos foi criada
              para oferecer soluções completas em materiais elétricos. Hoje, atende residências, comércios, indústrias e
              profissionais da área, combinando produtos de qualidade, atendimento diferenciado e suporte técnico
              especializado.
            </p>
            <p className="qs-estoque">
              <Boxes size={22} aria-hidden /> Variedade com mais de <strong>3.000 itens</strong> em estoque
            </p>
          </div>
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container">
          <h2 className="centro">Linha de produtos</h2>
          <div className="qs-linhas">
            {LINHAS.map(({ Icone, titulo, itens }) => (
              <div key={titulo} className="card qs-linha">
                <h3>
                  <span className="icone-circulo icone-pequeno" aria-hidden>
                    <Icone size={20} />
                  </span>
                  {titulo}
                </h3>
                <ul>
                  {itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="secao">
        <div className="container">
          <h2 className="centro">Conheça nosso espaço</h2>
          <div className="qs-fotos">
            {FOTOS.map((f) => (
              <figure key={f.src} className="qs-fotos-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={f.legenda} loading="lazy" width={383} height={584} />
                <figcaption>{f.legenda}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container grid-2 qs-blocos">
          <div className="card">
            <h2>Mão de obra especializada</h2>
            <p>
              Além da venda de materiais elétricos, contamos com profissionais experientes para atender projetos e
              execuções em:
            </p>
            <ul className="qs-check">
              {SERVICOS.map((s) => (
                <li key={s}>
                  <CheckCircle2 size={20} aria-hidden /> {s}
                </li>
              ))}
            </ul>
            <WhatsAppButton texto={MSG.servico}>Solicite um orçamento</WhatsAppButton>
          </div>
          <div className="card">
            <h2>Ao lado do cliente em cada etapa do projeto</h2>
            <p>Compromissos e diferenciais:</p>
            <ul className="qs-check">
              {DIFERENCIAIS.map((d) => (
                <li key={d}>
                  <CheckCircle2 size={20} aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {VIDEO_QUEM_SOMOS && (
        <section className="secao">
          <div className="container estreito">
            <Video src={VIDEO_QUEM_SOMOS} titulo="Quem Somos" />
          </div>
        </section>
      )}
    </>
  );
}
