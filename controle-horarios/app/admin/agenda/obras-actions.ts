"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida, formatarData, hojeSP, horaValida } from "@/lib/datas";
import { MAX_DIAS_OBRA } from "@/lib/obras";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import { cadastrarClienteSeNovo } from "@/lib/clientes-servidor";
import type { Resultado } from "@/lib/tipos";

// Serviços em andamento: cada dia escolhido vira um agendamento (um por eletricista),
// ligado à obra. Assim aparecem no calendário e na "Minha agenda" de cada eletricista.

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function atualizar() {
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/clientes");
  revalidatePath("/eletricista");
}

function lerInfo(form: FormData) {
  const erros: Record<string, string> = {};
  const cliente = texto(form, "cliente");
  const hora = texto(form, "hora") || null;
  if (!cliente) erros.cliente = "Informe o cliente ou a obra.";
  if (hora && !horaValida(hora)) erros.hora = "Hora inválida (ex.: 07:30).";
  const dados = {
    cliente: cliente.slice(0, 200),
    hora,
    endereco: texto(form, "endereco").slice(0, 300) || null,
    telefone: texto(form, "telefone").slice(0, 30) || null,
    servico: texto(form, "servico").slice(0, 2000) || null,
    observacoes: texto(form, "observacoes").slice(0, 2000) || null,
  };
  return { dados, erros };
}

/** Dias e eletricistas escolhidos no formulário. */
function lerDias(form: FormData, erros: Record<string, string>) {
  const datas = [...new Set(form.getAll("datas").map(String).filter(dataValida))].sort();
  const colaboradores = [...new Set(form.getAll("colaboradores").map(String).filter(Boolean))];
  if (datas.length === 0) erros.datas = "Escolha pelo menos um dia.";
  else if (datas.length > MAX_DIAS_OBRA) erros.datas = `No máximo ${MAX_DIAS_OBRA} dias de cada vez.`;
  if (colaboradores.length === 0) erros.colaboradores = "Escolha pelo menos um eletricista.";
  return { datas, colaboradores };
}

type Info = ReturnType<typeof lerInfo>["dados"];
type Supa = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Cria os agendamentos que ainda não existem (mesmo dia + mesmo eletricista não repete). */
async function criarDias(supabase: Supa, obraId: string, info: Info, datas: string[], colaboradores: string[]) {
  const { data: existentes } = await supabase.from("agendamentos").select("data, colaborador_id").eq("obra_id", obraId);
  const ja = new Set((existentes ?? []).map((a) => `${a.data}|${a.colaborador_id}`));
  const linhas = datas.flatMap((data) =>
    colaboradores.filter((c) => !ja.has(`${data}|${c}`)).map((c) => ({ ...info, data, colaborador_id: c, obra_id: obraId, status: "agendado" })),
  );
  const novas = [...new Set(linhas.map((l) => l.data))];
  if (linhas.length === 0) return { novas, erro: null };
  const { error } = await supabase.from("agendamentos").insert(linhas);
  return { novas, erro: error };
}

function resumoDias(datas: string[]) {
  return datas.length === 1 ? `1 dia (${formatarData(datas[0])})` : `${datas.length} dias (de ${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])})`;
}

export async function criarObra(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const { dados, erros } = lerInfo(form);
  const { datas, colaboradores } = lerDias(form, erros);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { data: obra, error } = await supabase.from("obras").insert(dados).select("id").single();
  if (error || !obra) return falha("Não foi possível salvar. Tente novamente.", form);
  const { erro } = await criarDias(supabase, obra.id, dados, datas, colaboradores);
  if (erro) {
    await supabase.from("obras").delete().eq("id", obra.id);
    return falha("Não foi possível agendar os dias. Tente novamente.", form);
  }
  await cadastrarClienteSeNovo(supabase, form);
  atualizar();
  return sucesso(`${dados.cliente}: ${resumoDias(datas)} na agenda.`);
}

export async function adicionarDiasObra(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const erros: Record<string, string> = {};
  const { datas, colaboradores } = lerDias(form, erros);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { data: obra } = await supabase.from("obras").select("cliente, endereco, telefone, servico, observacoes, hora").eq("id", texto(form, "obra_id")).single();
  if (!obra) return falha("Serviço não encontrado.");
  const { novas, erro } = await criarDias(supabase, texto(form, "obra_id"), obra as Info, datas, colaboradores);
  if (erro) return falha("Não foi possível agendar os dias. Tente novamente.", form);
  await supabase.from("obras").update({ status: "andamento" }).eq("id", texto(form, "obra_id"));
  atualizar();
  return sucesso(novas.length ? `${obra.cliente}: ${resumoDias(novas)} adicionados.` : "Esses dias já estavam na agenda.");
}

/** Edita as informações; os dias que ainda vão acontecer recebem as novas informações. */
export async function editarObra(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const { dados, erros } = lerInfo(form);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);
  const id = texto(form, "id");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("obras").update(dados).eq("id", id);
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  await supabase.from("agendamentos").update(dados).eq("obra_id", id).eq("status", "agendado").gte("data", hojeSP());
  await cadastrarClienteSeNovo(supabase, form);
  atualizar();
  return sucesso("Serviço atualizado (também nos próximos dias da agenda).");
}

/**
 * Concluir: os dias que ainda iam acontecer (depois de hoje) são cancelados.
 * Reabrir: volta para "em andamento" e os dias futuros cancelados voltam para a agenda.
 */
export async function alterarStatusObra(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id");
  const concluir = texto(form, "status") === "concluida";
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("obras").update({ status: concluir ? "concluida" : "andamento" }).eq("id", id).select("cliente").single();
  if (error || !data) return falha("Não foi possível alterar. Tente novamente.");
  await supabase.from("agendamentos")
    .update({ status: concluir ? "cancelado" : "agendado" })
    .eq("obra_id", id).eq("status", concluir ? "agendado" : "cancelado").gt("data", hojeSP());
  atualizar();
  return sucesso(concluir ? `${data.cliente} concluído. Os próximos dias saíram da agenda.` : `${data.cliente} voltou para os serviços em andamento, com os próximos dias na agenda.`);
}

export async function excluirObra(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("obras").delete().eq("id", texto(form, "id")).select("cliente");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso(`${data[0].cliente} e todos os dias dele foram excluídos da agenda.`);
}

/** Tira um dia da obra (de todos os eletricistas daquele dia). */
export async function tirarDiaObra(obraId: string, data: string): Promise<Resultado> {
  await exigirAdmin();
  if (!dataValida(data)) return falha("Data inválida.");
  const supabase = await criarClienteServidor();
  const { data: linhas, error } = await supabase.from("agendamentos").delete().eq("obra_id", obraId).eq("data", data).select("id");
  if (error || !linhas?.length) return falha("Não foi possível tirar o dia. Tente novamente.");
  atualizar();
  return sucesso(`${formatarData(data)} saiu da agenda.`);
}
