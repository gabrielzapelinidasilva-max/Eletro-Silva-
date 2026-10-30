"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida, formatarData, horaValida } from "@/lib/datas";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import { cadastrarClienteSeNovo } from "@/lib/clientes-servidor";
import { MAX_DIAS_OBRA } from "@/lib/obras";
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
  // Repetir: o mesmo serviço em vários dias (só ao agendar um novo).
  const repetir = !id && texto(form, "repetir") === "1";
  const datas = repetir ? [...new Set(form.getAll("datas").map(String).filter(dataValida))].sort() : [data];
  if (repetir) {
    if (datas.length === 0) erros.datas = "Escolha pelo menos um dia.";
    else if (datas.length > MAX_DIAS_OBRA) erros.datas = `No máximo ${MAX_DIAS_OBRA} dias de cada vez.`;
  } else if (!dataValida(data)) erros.data = "Informe a data.";
  if (hora && !horaValida(hora)) erros.hora = "Hora inválida (ex.: 08:30).";
  if (!cliente) erros.cliente = "Informe o cliente.";
  const campos = {
    endereco: texto(form, "endereco").slice(0, 300) || null,
    telefone: texto(form, "telefone").slice(0, 30) || null,
    servico: texto(form, "servico").slice(0, 2000) || null,
    observacoes: texto(form, "observacoes").slice(0, 2000) || null,
  };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const linha = { hora, cliente: cliente.slice(0, 200), colaborador_id: colaborador, status, ...campos };
  const supabase = await criarClienteServidor();
  let error;
  if (id) {
    ({ error } = await supabase.from("agendamentos").update({ ...linha, data }).eq("id", id));
    // "Aplicar também aos próximos dias desta repetição" (menos a data, que é de cada dia).
    const serie = texto(form, "serie_id");
    if (!error && serie && texto(form, "aplicar_serie") === "1") {
      ({ error } = await supabase.from("agendamentos").update(linha).eq("serie_id", serie).gte("data", data).neq("id", id));
    }
  } else {
    const serie_id = datas.length > 1 ? crypto.randomUUID() : null;
    ({ error } = await supabase.from("agendamentos").insert(datas.map((d) => ({ ...linha, data: d, serie_id }))));
  }
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  await cadastrarClienteSeNovo(supabase, form);
  atualizar();
  revalidatePath("/admin/clientes");
  if (id) return sucesso(texto(form, "aplicar_serie") === "1" ? "Agendamento atualizado (também nos próximos dias da repetição)." : "Agendamento atualizado.");
  return sucesso(datas.length > 1
    ? `Serviço agendado em ${datas.length} dias (de ${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}).`
    : `Serviço agendado para ${formatarData(datas[0])}.`);
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
  const serie = texto(form, "serie_id");
  // "Excluir também os próximos dias desta repetição"
  const consulta = serie && texto(form, "toda_serie") === "1" && dataValida(texto(form, "data"))
    ? supabase.from("agendamentos").delete().eq("serie_id", serie).gte("data", texto(form, "data"))
    : supabase.from("agendamentos").delete().eq("id", texto(form, "id"));
  const { data, error } = await consulta.select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso(data.length > 1 ? `${data.length} agendamentos excluídos.` : "Agendamento excluído.");
}
