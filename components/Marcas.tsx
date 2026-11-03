import { BadgeCheck } from "lucide-react";
import { MARCAS } from "@/lib/site";

const SELOS = ["Qualidade", "Garantia", "Procedência"];

/** Faixa com as marcas parceiras, exibida no fim de todas as páginas. */
export default function Marcas() {
  return (
    <section className="marcas" aria-labelledby="marcas-titulo">
      <div className="container marcas-inner">
        <div className="marcas-chamada">
          <h2 id="marcas-titulo">
            As melhores <span>marcas</span> você encontra aqui!
          </h2>
          <ul className="marcas-selos">
            {SELOS.map((s) => (
              <li key={s}>
                <BadgeCheck size={18} aria-hidden /> {s}
              </li>
            ))}
          </ul>
        </div>
        <ul className="marcas-grade">
          {MARCAS.map((m) => {
            // eslint-disable-next-line @next/next/no-img-element
            const logo = <img src={m.logo} alt={m.nome} loading="lazy" />;
            return (
              <li key={m.nome}>
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noopener" title={`Site da ${m.nome}`}>
                    {logo}
                  </a>
                ) : (
                  <span>{logo}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
