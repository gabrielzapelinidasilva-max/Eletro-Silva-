import { Cabecalho } from "@/components/Cabecalho";
import { AdminNav } from "@/components/AdminNav";
import { exigirAdmin } from "@/lib/auth";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const perfil = await exigirAdmin();
  return (
    <>
      <Cabecalho perfil={perfil}>
        <AdminNav />
      </Cabecalho>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
    </>
  );
}
