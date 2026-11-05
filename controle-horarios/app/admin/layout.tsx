import { Cabecalho } from "@/components/Cabecalho";
import { AdminNav } from "@/components/AdminNav";
import { exigirGestorAgenda } from "@/lib/auth";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  // Cada página confere de novo: o encarregado só entra no Resumo, nos Registros e na Agenda.
  const perfil = await exigirGestorAgenda();
  return (
    <>
      <Cabecalho perfil={perfil}>
        <AdminNav modo={perfil.funcao === "admin" ? "admin" : "encarregado"} />
      </Cabecalho>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
    </>
  );
}
