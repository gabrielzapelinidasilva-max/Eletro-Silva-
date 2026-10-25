import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: { default: "Eletro Silva – Controle de Horários", template: "%s | Eletro Silva" },
  description: "Controle de horários e serviços dos eletricistas da Eletro Silva Materiais Elétricos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0049af", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
