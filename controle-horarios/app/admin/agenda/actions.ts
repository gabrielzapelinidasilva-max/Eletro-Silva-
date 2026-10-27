"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida, formatarData, horaValida } from "@/lib/datas";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function atualizar() {
  revalidatePath("/admin/agenda");
  revalidatePath("/eletricista");
}

export async function salvarAgendamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const erros: Record<string, string> = {};
  const id = texto(form, "id");
  const data = texto(form, "data");
  const hora = texto(form, "hora") || null;
  const cliente = texto(form, "cliente");
  const colaborador = texto(form, "colaborador_id") || null;
  const status = ["agendado", "concluido", "cancelado"].includes(texto(form, "status")) ? texto(form, "status") : "agendado";
  if (!dataValida(data)) erros.data = "Informe a data.";
  if (hora && !horaValida(hora)) erros.hora = "Hora inválida (ex.: 08:30).";
  if (!cliente) erros.cliente = "Informe o cliente.";
  const campos = {
    endereco: texto(form, "endereco").slice(0, 300) || null,
    telefone: texto(form, "telefone").slice(0, 30) || null,
    servico: texto(form, "servico").slice(0, 2000) || null,
    observacoes: texto(form, "observacoes").slice(0, 2000) || null,
  };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const linha = { data, hora, cliente: cliente.slice(0, 200), colaborador_id: colaborador, status, ...campos };
  const supabase = await criarClienteServidor();
  const { error } = id ? await supabase.from("agendamentos").update(linha).eq("id", id) : await supabase.from("agendamentos").insert(linha);
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  atualizar();
  return sucesso(id ? "Agendamento atualizado." : `Serviço agendado para ${formatarData(data)}.`);
}

/** Move um agendamento para outro dia (arrastar e soltar ou botão "Mover"). */
export async function moverAgendamento(id: string, data: string): Promise<Resultado> {
  await exigirAdmin();
  if (!dataValida(data)) return falha("Data inválida.");
  const supabase = await criarClienteServidor();
  const { data: linha, error } = await supabase.from("agendamentos").update({ data }).eq("id", id).select("cliente").single();
  if (error || !linha) return falha("Não foi possível mover. Tente novamente.");
  atualizar();
  return sucesso(`${linha.cliente} foi para ${formatarData(data)}.`);
}

export async function excluirAgendamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("agendamentos").delete().eq("id", texto(form, "id")).select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso("Agendamento excluído.");
}
