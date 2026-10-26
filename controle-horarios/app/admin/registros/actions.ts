"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { lerGastosRegistro, lerRegistro, mensagemErroBanco, validarRegistro } from "@/lib/validacao";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
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
  return sucesso("Registro excluído.");
}
