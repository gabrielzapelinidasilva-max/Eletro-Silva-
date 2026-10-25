import { redirect } from "next/navigation";
import { obterPerfil, rotaInicial } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  if (!supabaseConfigurado()) redirect("/login");
  const perfil = await obterPerfil();
  if (!perfil || !perfil.ativo) redirect("/login");
  redirect(rotaInicial(perfil));
}
