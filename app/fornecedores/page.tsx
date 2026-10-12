import PageHeader from "@/components/PageHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import { MSG } from "@/lib/site";
import FormFornecedor from "./FormFornecedor";

export const metadata = { title: "Fornecedores" };

export default function Fornecedores() {
  return (
    <>
      <PageHeader
        titulo="Fornecedores"
        subtitulo="Quer apresentar seus produtos para a Eletro Silva? Fale com nosso setor de compras."
      />
      <section className="secao">
        <div className="container estreito">
          <div className="botoes centro">
            <WhatsAppButton texto={MSG.fornecedor}>💼 Falar com Compras</WhatsAppButton>
          </div>
          <h2 className="centro">Ou deixe seus dados</h2>
          <FormFornecedor />
        </div>
      </section>
    </>
  );
}
