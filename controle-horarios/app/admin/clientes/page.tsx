import type { Metadata } from "next";
import { ListaClientes } from "./ListaClientes";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("clientes").select("id, nome, endereco, telefone, observacoes").order("nome");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
      <p className="mb-5 text-slate-500">Cadastre nome, endereço e telefone. Na Agenda, ao digitar o nome do cliente, o endereço e o telefone são preenchidos sozinhos.</p>
      <ListaClientes clientes={(data ?? []) as Cliente[]} />
    </div>
  );
}
