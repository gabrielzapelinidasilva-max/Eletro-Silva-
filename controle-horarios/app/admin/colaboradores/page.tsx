import type { Metadata } from "next";
import { ListaColaboradores } from "./ListaColaboradores";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function PaginaColaboradores() {
  const eu = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("profiles").select("*").order("ativo", { ascending: false }).order("nome");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Colaboradores</h1>
      <p className="mb-5 text-slate-500">Cadastre, edite e controle o acesso da equipe.</p>
      <ListaColaboradores colaboradores={(data ?? []) as Perfil[]} meuId={eu.id} />
    </div>
  );
}
