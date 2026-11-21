import type { Metadata } from "next";
import { usuarioAtual } from "@/lib/supabase/server";
import { TelaEquipamentos } from "./TelaEquipamentos";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function Equipamentos() {
  const atual = await usuarioAtual();
  return <TelaEquipamentos admin={atual?.perfil.role === "admin"} />;
}
