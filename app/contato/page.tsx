import PageHeader from "@/components/PageHeader";
import { EMAIL, ENDERECO, FIXO, FIXO_TEL, HORARIOS, MAPS_EMBED, MAPS_LINK, MSG, WHATSAPP_LABEL, wa } from "@/lib/site";

export const metadata = { title: "Contato" };

const CAIXAS = [
  { icone: "🛒", titulo: "Vendas e orçamentos", texto: MSG.orcamento },
  { icone: "👷", titulo: "Eletricistas", texto: MSG.eletricista },
  { icone: "🔧", titulo: "Serviços elétricos", texto: MSG.servico },
  { icone: "🔄", titulo: "Trocas e pós-venda", texto: MSG.posVenda },
  { icone: "💼", titulo: "Fornecedores", texto: MSG.fornecedor },
];

export default function Contato() {
  return (
    <>
      <PageHeader titulo="Contato" subtitulo={`Escolha o assunto e fale direto no WhatsApp ${WHATSAPP_LABEL}.`} />
      <section className="secao">
        <div className="container">
          <div className="grid-caixas">
            {CAIXAS.map((c) => (
              <a key={c.titulo} className="card caixa-whats" href={wa(c.texto)} target="_blank" rel="noopener">
                <span className="icone">{c.icone}</span>
                <strong>{c.titulo}</strong>
                <small>Abrir WhatsApp →</small>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="secao secao-alt">
        <div className="container grid-2">
          <div>
            <h2>Horário de atendimento</h2>
            <table className="horarios">
              <tbody>
                {HORARIOS.map((h) => (
                  <tr key={h.dia}>
                    <th scope="row">{h.dia}</th>
                    <td>{h.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>Endereço</h2>
            <p>{ENDERECO}</p>
            <p>
              <a className="btn btn-primario" href={MAPS_LINK} target="_blank" rel="noopener">📍 Como chegar</a>
            </p>

            <h2>Outros contatos</h2>
            <p>Telefone fixo: <a href={`tel:${FIXO_TEL}`}>{FIXO}</a></p>
            <p>E-mail: <a href={`mailto:${EMAIL}`}>{EMAIL}</a></p>
          </div>
          <div className="mapa">
            <iframe
              src={MAPS_EMBED}
              title="Mapa: Eletro Silva Materiais Elétricos"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
