import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/supabase/server";
import { Painel } from "./Painel";

export const metadata: Metadata = { title: "Checklists" };

export default async function Inicio() {
  const atual = await usuarioAtual();
  return <Painel admin={atual?.perfil.role === "admin"} meuId={atual?.perfil.id ?? ""} nome={atual?.perfil.nome ?? ""} />;
}
