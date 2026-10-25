"use server";

import { revalidatePath } from "next/cache";
import { exigirEletricista } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/datas";
import { lerGastosRegistro, lerRegistro, mensagemErroBanco, validarRegistro } from "@/lib/validacao";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Registro, Resultado } from "@/lib/tipos";

// O banco (RLS) também garante que o eletricista só mexe nos próprios registros de hoje.

export async function registrarChegada(_a: Resultado, form: FormData): Promise<Resultado> {
  const perfil = await exigirEletricista();
  const dados = { ...lerRegistro(form), data: hojeSP(), hora_saida: null, servico: null, observacoes: null };
  const erros = validarRegistro(dados);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("registros").insert({
    usuario_id: perfil.id,
    data: dados.data,
    hora_chegada: dados.hora_chegada,
    cliente: dados.cliente,
  });
  if (error) return falha(mensagemErroBanco(error), form);

  revalidatePath("/eletricista");
  return sucesso(`Chegada registrada às ${dados.hora_chegada}.`);
}

async function buscarMeuRegistroDeHoje(id: string) {
  const perfil = await exigirEletricista();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("registros").select("*").eq("id", id).eq("usuario_id", perfil.id).single();
  const registro = data as Registro | null;
  if (!registro) return { supabase, registro: null, erro: "Registro não encontrado." };
  if (registro.data !== hojeSP()) return { supabase, registro: null, erro: "Só é possível alterar registros de hoje." };
  return { supabase, registro, erro: null };
}

export async function registrarSaida(_a: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, registro, erro } = await buscarMeuRegistroDeHoje(String(form.get("id") ?? ""));
  if (!registro) return falha(erro!, form);

  const lido = lerRegistro(form);
  const dados = { ...lido, data: registro.data, hora_chegada: registro.hora_chegada.slice(0, 5), cliente: lido.cliente || registro.cliente };
  const gastos = lerGastosRegistro(form);
  const erros = { ...validarRegistro(dados, { exigirSaida: true }), ...gastos.erros };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  // Ao salvar com saída, o banco cria sozinho o lançamento da aba Gastos do administrador.
  const { error } = await supabase
    .from("registros")
    .update({ hora_saida: dados.hora_saida, cliente: dados.cliente, servico: dados.servico, observacoes: dados.observacoes, ...gastos.dados })
    .eq("id", registro.id);
  if (error) return falha(mensagemErroBanco(error), form);

  revalidatePath("/eletricista");
  return sucesso(`Saída registrada às ${dados.hora_saida}. Bom descanso!`);
}

export async function editarMeuRegistro(_a: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, registro, erro } = await buscarMeuRegistroDeHoje(String(form.get("id") ?? ""));
  if (!registro) return falha(erro!, form);

  const dados = { ...lerRegistro(form), data: registro.data };
  const gastos = lerGastosRegistro(form);
  const erros = { ...validarRegistro(dados), ...gastos.erros };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const { error } = await supabase
    .from("registros")
    .update({
      hora_chegada: dados.hora_chegada,
      hora_saida: dados.hora_saida,
      cliente: dados.cliente,
      servico: dados.servico,
      observacoes: dados.observacoes,
      ...gastos.dados,
    })
    .eq("id", registro.id);
  if (error) return falha(mensagemErroBanco(error), form);

  revalidatePath("/eletricista");
  return sucesso("Registro atualizado.");
}
