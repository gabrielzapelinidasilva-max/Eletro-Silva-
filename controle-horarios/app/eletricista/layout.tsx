import { Cabecalho } from "@/components/Cabecalho";
import { AdminNav } from "@/components/AdminNav";
import { exigirAreaPessoal } from "@/lib/auth";

export default async function LayoutEletricista({ children }: { children: React.ReactNode }) {
  const perfil = await exigirAreaPessoal();
  return (
    <>
      <Cabecalho perfil={perfil}>
        {perfil.funcao === "admin" ? <AdminNav modo="admin" /> : perfil.encarregado ? <AdminNav modo="encarregado" /> : null}
      </Cabecalho>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">{children}</main>
    </>
  );
}
