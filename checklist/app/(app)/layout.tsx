import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { usuarioAtual } from "@/lib/supabase/server";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const atual = await usuarioAtual();
  if (!atual || !atual.perfil.ativo) redirect("/login");
  const admin = atual.perfil.role === "admin";

  return (
    <>
      <Cabecalho nome={atual.perfil.nome} admin={admin} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:pb-12">{children}</main>
    </>
  );
}
