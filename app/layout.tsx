import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MSG, wa } from "@/lib/site";
import "@fontsource-variable/inter";
import "@fontsource-variable/montserrat";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eletro Silva Materiais Elétricos | Braço do Norte/SC",
    template: "%s | Eletro Silva Materiais Elétricos",
  },
  description:
    "Tudo em material elétrico em Braço do Norte/SC. Do fio à iluminação, venda e instalação elétrica desde 2012. Orçamento pelo WhatsApp (48) 99814-9358.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <a className="whats-float" href={wa(MSG.orcamento)} target="_blank" rel="noopener" aria-label="Fale no WhatsApp">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden fill="currentColor">
            <path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.7 12.7-12.6C28.8 8.6 23.1 3 16 3zm0 23.1c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-4.3 1.1 1.2-4.2-.3-.4a10.4 10.4 0 0 1-1.6-5.4C5.3 9.8 10.1 5.1 16 5.1s10.6 4.7 10.6 10.5S21.9 26.1 16 26.1zm5.8-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.7 1.2 3.2 1.4 3.4 2.4 3.6 5.7 5c2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.3z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
