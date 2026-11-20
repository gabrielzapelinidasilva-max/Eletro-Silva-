import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/supabase/server";
import { TelaChecklist } from "./TelaChecklist";

export const metadata: Metadata = { title: "Checklist" };

export default async function PaginaChecklist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const atual = await usuarioAtual();
  return <TelaChecklist id={id} admin={atual?.perfil.role === "admin"} meuId={atual?.perfil.id ?? ""} />;
}
