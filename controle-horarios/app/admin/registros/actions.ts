"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerGastosRegistro, lerRegistro, mensagemErroBanco, validarRegistro } from "@/lib/validacao";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import { cadastrarClienteSeNovo } from "@/lib/clientes-servidor";
import { formatarData } from "@/lib/datas";
import type { Resultado } from "@/lib/tipos";

export async function adminEditarRegistro(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = String(form.get("id") ?? "");
  const dados = lerRegistro(form);
  const gastos = lerGastosRegistro(form, { incluirValores: true });
  const erros = { ...validarRegistro(dados), ...gastos.erros };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("registros")
    .update({
      data: dados.data,
      hora_chegada: dados.hora_chegada,
      hora_saida: dados.hora_saida,
      cliente: dados.cliente,
      servico: dados.servico,
      observacoes: dados.observacoes,
      ...gastos.dados,
    })
    .eq("id", id)
    .select("id");
  if (error) return falha(mensagemErroBanco(error), form);
  if (!data?.length) return falha("Registro não encontrado.", form);

  revalidatePath("/admin", "layout");
  return sucesso("Registro atualizado.");
}

export async function adminExcluirRegistro(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("registros").delete().eq("id", String(form.get("id") ?? "")).select("id");
  if (error) return falha(mensagemErroBanco(error));
  if (!data?.length) return falha("Registro não encontrado.");

  revalidatePath("/admin", "layout");
  return sucesso("Registro movido para a Lixeira. Se foi sem querer, restaure por lá.");
}

/** Nota avulsa: o administrador lança um registro para qualquer colaborador e qualquer data. */
export async function adminCriarRegistro(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const usuario = String(form.get("usuario_id") ?? "");
  const dados = lerRegistro(form);
  const gastos = lerGastosRegistro(form, { incluirValores: true });
  const erros: Record<string, string> = { ...validarRegistro(dados, { exigirSaida: true }), ...gastos.erros };
  if (!/^[0-9a-f-]{36}$/i.test(usuario)) erros.usuario_id = "Escolha o colaborador.";
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("registros").insert({
    usuario_id: usuario,
    data: dados.data,
    hora_chegada: dados.hora_chegada,
    hora_saida: dados.hora_saida,
    cliente: dados.cliente,
    servico: dados.servico,
    observacoes: dados.observacoes,
    ...gastos.dados,
  });
  if (error) return falha(mensagemErroBanco(error), form);
  await cadastrarClienteSeNovo(supabase, form);

  revalidatePath("/admin", "layout");
  return sucesso(`Nota lançada para ${formatarData(dados.data)}. Ela já aparece nos Registros, no Histórico e em Gastos.`);
}
