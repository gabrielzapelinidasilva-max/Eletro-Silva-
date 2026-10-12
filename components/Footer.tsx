import { ENDERECO_CURTO, FACEBOOK_MATERIAIS, FIXO, FIXO_TEL, INSTAGRAM, MSG, WHATSAPP_LABEL, wa } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong>Eletro Silva Materiais Elétricos</strong> · Desde 2012
          <p>{ENDERECO_CURTO}</p>
          <p>Seg a sex 8h–12h / 13h30–18h · Sáb 8h–12h</p>
        </div>
        <div>
          <p>
            WhatsApp <a href={wa(MSG.orcamento)} target="_blank" rel="noopener">{WHATSAPP_LABEL}</a> · Fixo{" "}
            <a href={`tel:${FIXO_TEL}`}>{FIXO}</a>
          </p>
          <p>
            Instagram <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener">@{INSTAGRAM}</a> ·{" "}
            <a href={FACEBOOK_MATERIAIS} target="_blank" rel="noopener">Facebook</a>
          </p>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} Eletro Silva Materiais Elétricos</p>
    </footer>
  );
}
