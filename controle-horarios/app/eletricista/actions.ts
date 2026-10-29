"use server";

import { revalidatePath } from "next/cache";
import { exigirEletricista } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP, horaAgoraSP } from "@/lib/datas";
import { lerGastosRegistro, lerRegistro, mensagemErroBanco, validarRegistro } from "@/lib/validacao";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import { MAX_FOTOS, caminhoValido } from "@/lib/fotos";
import type { Registro, Resultado } from "@/lib/tipos";

// O banco (RLS) também garante que o eletricista só mexe nos próprios registros de hoje.
// As horas de chegada e saída são sempre a hora do momento: o eletricista não escolhe
// (o banco também força isso para quem não é administrador).

export async function registrarChegada(_a: Resultado, form: FormData): Promise<Resultado> {
  const perfil = await exigirEletricista();
  const dados = { ...lerRegistro(form), data: hojeSP(), hora_chegada: horaAgoraSP(), hora_saida: null, servico: null, observacoes: null };
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
  const dados = { ...lido, data: registro.data, hora_chegada: registro.hora_chegada.slice(0, 5), hora_saida: horaAgoraSP(), cliente: lido.cliente || registro.cliente };
  if (form.get("enviando") === "1") return falha("Aguarde terminar de enviar as fotos/assinatura.", form);
  const gastos = lerGastosRegistro(form);
  const erros = { ...validarRegistro(dados, { exigirSaida: true }), ...gastos.erros };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  // Fotos e assinatura (opcionais): só caminhos da pasta deste eletricista e deste registro.
  const doRegistro = (campo: string) =>
    form.getAll(campo).map(String).filter((c) => caminhoValido(c, registro.usuario_id, registro.id)).slice(0, MAX_FOTOS);
  const assinatura = String(form.get("assinatura") ?? "");
  const anexos = {
    fotos_antes: doRegistro("fotos_antes"),
    fotos_depois: doRegistro("fotos_depois"),
    assinatura: caminhoValido(assinatura, registro.usuario_id, registro.id) ? assinatura : null,
    assinatura_nome: String(form.get("assinatura_nome") ?? "").trim().slice(0, 120) || null,
  };

  // Ao salvar com saída, o banco cria sozinho o lançamento da aba Gastos do administrador.
  const { error } = await supabase
    .from("registros")
    .update({ hora_saida: dados.hora_saida, cliente: dados.cliente, servico: dados.servico, observacoes: dados.observacoes, ...gastos.dados, ...anexos })
    .eq("id", registro.id);
  if (error) return falha(mensagemErroBanco(error), form);

  revalidatePath("/eletricista");
  return sucesso(`Saída registrada às ${dados.hora_saida}. Bom descanso!`);
}

export async function editarMeuRegistro(_a: Resultado, form: FormData): Promise<Resultado> {
  const { supabase, registro, erro } = await buscarMeuRegistroDeHoje(String(form.get("id") ?? ""));
  if (!registro) return falha(erro!, form);

  // As horas ficam como foram registradas; só o administrador altera.
  const dados = { ...lerRegistro(form), data: registro.data, hora_chegada: registro.hora_chegada.slice(0, 5), hora_saida: registro.hora_saida?.slice(0, 5) ?? null };
  const gastos = lerGastosRegistro(form);
  const erros = { ...validarRegistro(dados), ...gastos.erros };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const { error } = await supabase
    .from("registros")
    .update({
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
