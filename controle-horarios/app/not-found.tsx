import Link from "next/link";
import { classesBotao } from "@/components/ui/estilos";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-extrabold text-marca-600">404</p>
      <p className="text-lg font-semibold text-slate-700">Página não encontrada.</p>
      <Link href="/" className={classesBotao("primario", "lg")}>Voltar ao início</Link>
    </main>
  );
}
