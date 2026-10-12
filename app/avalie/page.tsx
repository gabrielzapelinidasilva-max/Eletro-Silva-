import QRCode from "qrcode";
import "@fontsource/barlow-condensed/800-italic.css";
import { GOOGLE_AVALIACAO } from "@/lib/site";

export const metadata = { title: "Nos Avalie" };

const PASSOS = [
  "Aponte a câmera do celular para o QR code",
  "Deixe sua avaliação no Google",
  "Pronto! Obrigado por nos ajudar a crescer",
];

export default async function Avalie() {
  const qr = await QRCode.toString(GOOGLE_AVALIACAO, { type: "svg", margin: 0, color: { dark: "#14213a", light: "#ffffff" } });

  return (
    <section className="avalie">
      <div className="container estreito">
        <h1 className="avalie-titulo">Sua opinião</h1>
        <p className="avalie-tag">é muito importante!</p>

        <div className="avalie-corpo">
          <div className="avalie-qr">
            <div className="avalie-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="avalie-estrelas" aria-label="5 estrelas">★★★★★</div>
          </div>
          <ol className="avalie-passos">
            {PASSOS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>

        <div className="botoes centro">
          <a className="btn btn-primario btn-grande" href={GOOGLE_AVALIACAO} target="_blank" rel="noopener">
            Avaliar no Google
          </a>
        </div>
        <p className="avalie-dica">Está no celular? É só tocar no botão acima.</p>
      </div>
      <div className="avalie-faixa">Obrigado pela preferência!</div>
    </section>
  );
}
