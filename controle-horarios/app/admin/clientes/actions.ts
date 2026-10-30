"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { chaveNome } from "@/lib/clientes";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function atualizar() {
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/agenda");
}

export async function salvarCliente(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nome = texto(form, "nome").replace(/\s+/g, " ");
  if (!nome) return falhaValidacao({ nome: "Informe o nome do cliente." }, form);
  const dados = {
    nome: nome.slice(0, 200),
    endereco: texto(form, "endereco").slice(0, 300) || null,
    telefone: texto(form, "telefone").slice(0, 30) || null,
    observacoes: texto(form, "observacoes").slice(0, 2000) || null,
  };
  const id = texto(form, "id");
  const supabase = await criarClienteServidor();
  const { error } = id ? await supabase.from("clientes").update(dados).eq("id", id) : await supabase.from("clientes").insert(dados);
  if (error?.code === "23505") return falhaValidacao({ nome: "Já existe um cliente com esse nome." }, form);
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  atualizar();
  return sucesso(id ? "Cliente atualizado." : `${dados.nome} cadastrado.`);
}

export async function excluirCliente(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("clientes").delete().eq("id", texto(form, "id")).select("nome");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso(`${data[0].nome} saiu do cadastro. Os serviços dele continuam no histórico.`);
}

/** Cadastra os clientes que já aparecem nos registros e na agenda (com o endereço, quando houver). */
export async function importarClientes(_a: Resultado): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const [{ data: cadastrados }, { data: agenda }, { data: registros }] = await Promise.all([
    supabase.from("clientes").select("nome"),
    supabase.from("agendamentos").select("cliente, endereco, telefone").order("data", { ascending: false }).limit(5000),
    supabase.from("registros").select("cliente").order("data", { ascending: false }).limit(5000),
  ]);
  const ja = new Set((cadastrados ?? []).map((c) => chaveNome(c.nome)));
  const novos = new Map<string, { nome: string; endereco: string | null; telefone: string | null }>();
  for (const a of agenda ?? []) {
    const k = chaveNome(a.cliente);
    if (ja.has(k)) continue;
    const atual = novos.get(k);
    if (!atual) novos.set(k, { nome: a.cliente.trim().replace(/\s+/g, " "), endereco: a.endereco, telefone: a.telefone });
    else { atual.endereco ??= a.endereco; atual.telefone ??= a.telefone; }
  }
  for (const r of registros ?? []) {
    const k = chaveNome(r.cliente);
    if (!ja.has(k) && !novos.has(k)) novos.set(k, { nome: r.cliente.trim().replace(/\s+/g, " "), endereco: null, telefone: null });
  }
  if (novos.size === 0) return sucesso("Todos os clientes do histórico e da agenda já estão cadastrados.");
  const lista = [...novos.values()];
  let ok = lista.length;
  if ((await supabase.from("clientes").insert(lista)).error) {
    // Algum nome bateu com um já cadastrado: cadastra um por um, pulando os repetidos.
    ok = 0;
    for (const c of lista) if (!(await supabase.from("clientes").insert(c)).error) ok++;
  }
  atualizar();
  return sucesso(`${ok} ${ok === 1 ? "cliente cadastrado" : "clientes cadastrados"} a partir do histórico e da agenda.`);
}
