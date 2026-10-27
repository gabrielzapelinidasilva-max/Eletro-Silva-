"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerNumero } from "@/lib/gastos";
import { CATEGORIAS } from "@/lib/fixos";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

// Só o administrador chega aqui (e as tabelas de gastos fixos têm RLS só para admin).

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function lerItem(form: FormData) {
  const erros: Record<string, string> = {};
  const descricao = texto(form, "descricao");
  const categoria = texto(form, "categoria");
  const valor = lerNumero(texto(form, "valor"));
  if (!descricao) erros.descricao = "Informe a descrição (ex.: Salário do João).";
  else if (descricao.length > 120) erros.descricao = "Descrição muito longa.";
  if (!CATEGORIAS.some((c) => c.valor === categoria)) erros.categoria = "Escolha a categoria.";
  if (valor == null || valor < 0 || valor > 10_000_000) erros.valor = "Informe o valor por mês. Ex.: 2500,00";
  return { dados: { descricao, categoria, valor: valor ?? 0 }, erros };
}

function atualizar() {
  revalidatePath("/admin/gastos");
}

/** Gasto fixo cadastrado (vale para os próximos meses que fecharem). */
export async function salvarGastoFixo(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const { dados, erros } = lerItem(form);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);
  const id = texto(form, "id");
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("gastos_fixos").update(dados).eq("id", id)
    : await supabase.from("gastos_fixos").insert(dados);
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  atualizar();
  return sucesso(id ? "Gasto fixo atualizado." : "Gasto fixo adicionado. Ele será descontado no fechamento de cada mês.");
}

export async function alterarGastoFixoAtivo(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const ativo = texto(form, "ativo") === "true";
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("gastos_fixos").update({ ativo }).eq("id", texto(form, "id")).select("descricao").single();
  if (error || !data) return falha("Não foi possível alterar. Tente novamente.");
  atualizar();
  return sucesso(ativo ? `${data.descricao} voltou a ser descontado todo mês.` : `${data.descricao} pausado: não entra nos próximos meses.`);
}

export async function excluirGastoFixo(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("gastos_fixos").delete().eq("id", texto(form, "id")).select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso("Gasto fixo excluído. Os meses já fechados continuam como estavam.");
}

/** Item de um mês já fechado (editar o valor lançado naquele mês). */
export async function salvarItemDoMes(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const { dados, erros } = lerItem(form);
  const mes = texto(form, "mes");
  if (!/^\d{4}-\d{2}-01$/.test(mes)) erros.descricao = "Mês inválido.";
  if (Object.keys(erros).length) return falhaValidacao(erros, form);
  const id = texto(form, "id");
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("gastos_fixos_mes").update(dados).eq("id", id)
    : await supabase.from("gastos_fixos_mes").insert({ ...dados, mes });
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  atualizar();
  return sucesso("Gastos do mês atualizados.");
}

export async function excluirItemDoMes(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("gastos_fixos_mes").delete().eq("id", texto(form, "id")).select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso("Item removido deste mês.");
}
