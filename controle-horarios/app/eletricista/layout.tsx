import { Cabecalho } from "@/components/Cabecalho";
import { AdminNav } from "@/components/AdminNav";
import { exigirEletricista } from "@/lib/auth";

export default async function LayoutEletricista({ children }: { children: React.ReactNode }) {
  const perfil = await exigirEletricista();
  return (
    <>
      <Cabecalho perfil={perfil}>{perfil.encarregado && <AdminNav modo="encarregado" />}</Cabecalho>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">{children}</main>
    </>
  );
}
