"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { falha, sucesso } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

function mensagemErro(msg: string | undefined): string {
  const m = msg ?? "";
  if (m.includes("ja_tem_aberto")) return "Não dá para restaurar: o eletricista já tem outro atendimento em aberto. Registre a saída dele primeiro.";
  if (m.includes("ja_existe")) return "Este serviço já foi restaurado.";
  if (m.includes("colaborador_nao_existe")) return "O colaborador deste serviço não existe mais.";
  if (m.includes("nao_encontrado")) return "Item não encontrado na lixeira.";
  if (m.includes("sem_permissao")) return "Você não tem permissão para fazer isso.";
  return "Não foi possível restaurar. Tente novamente.";
}

export async function restaurarItem(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("restaurar_da_lixeira", { p_id: String(form.get("id") ?? "") });
  if (error) return falha(mensagemErro(error.message));
  revalidatePath("/admin", "layout");
  return sucesso(`${data ?? "Item"} foi restaurado. Já aparece de novo nas abas (e para o eletricista).`);
}

export async function excluirDeVez(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("lixeira").delete().eq("id", String(form.get("id") ?? "")).select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  revalidatePath("/admin/lixeira");
  return sucesso("Excluído definitivamente.");
}

export async function esvaziarLixeira(_a: Resultado): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("lixeira").delete().not("id", "is", null);
  if (error) return falha("Não foi possível esvaziar a lixeira. Tente novamente.");
  revalidatePath("/admin/lixeira");
  return sucesso("Lixeira esvaziada.");
}
