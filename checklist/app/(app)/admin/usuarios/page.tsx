import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/supabase/server";
import { TelaUsuarios } from "./TelaUsuarios";

export const metadata: Metadata = { title: "Usuários" };

export default async function Usuarios() {
  const atual = await usuarioAtual();
  return <TelaUsuarios meuId={atual?.perfil.id ?? ""} />;
}
