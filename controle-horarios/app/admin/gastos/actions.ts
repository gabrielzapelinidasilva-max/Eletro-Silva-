"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida } from "@/lib/datas";
import { lerHoras, lerNumero } from "@/lib/gastos";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

// Só o administrador chega aqui (e o RLS das tabelas de gastos também exige administrador).

const MAXIMO = 10_000_000;

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

/** Lê um valor numérico do formulário; registra erro se inválido. */
function numero(form: FormData, campo: string, erros: Record<string, string>, { obrigatorio = false, rotulo = "valor" } = {}) {
  const bruto = texto(form, campo);
  if (!bruto) {
    if (obrigatorio) erros[campo] = `Informe o ${rotulo}.`;
    return 0;
  }
  const n = campo === "horas" ? lerHoras(bruto) : lerNumero(bruto);
  if (n == null || n < 0 || n > MAXIMO) {
    erros[campo] = campo === "horas" ? "Horas inválidas. Ex.: 3,5 ou 3:30" : `Valor inválido. Ex.: 150,00`;
    return 0;
  }
  return n;
}

function atualizar() {
  revalidatePath("/admin/gastos");
}

export async function salvarLancamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const id = texto(form, "id");
  const erros: Record<string, string> = {};

  const data = texto(form, "data");
  const cliente = texto(form, "cliente");
  const descricao = texto(form, "descricao") || null;
  const registroId = texto(form, "registro_id") || null;
  const veiculoId = texto(form, "veiculo_id") || null;
  if (!dataValida(data)) erros.data = "Informe a data do serviço.";
  if (!cliente) erros.cliente = "Informe o cliente.";
  else if (cliente.length > 200) erros.cliente = "Nome do cliente muito longo.";
  if (descricao && descricao.length > 2000) erros.descricao = "Texto muito longo (máx. 2000 caracteres).";

  const valorMaterial = numero(form, "valor_material", erros);
  const km = numero(form, "km_rodados", erros);
  const precoGasolina = numero(form, "preco_gasolina", erros, { obrigatorio: true, rotulo: "preço da gasolina" });
  const horas = numero(form, "horas", erros);
  const valorHora = numero(form, "valor_hora", erros);
  const valorServico = numero(form, "valor_servico", erros, { obrigatorio: true, rotulo: "valor do serviço" });
  if (km > 0 && !veiculoId) erros.veiculo_id = "Escolha o carro usado para calcular a gasolina.";
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  // Copia o consumo do carro no momento do lançamento.
  let veiculo: { nome: string; consumo_km_l: number } | null = null;
  if (veiculoId) {
    const { data: v } = await supabase.from("veiculos").select("nome, consumo_km_l").eq("id", veiculoId).single();
    if (!v) return falha("Carro não encontrado.", form, { veiculo_id: "Carro não encontrado." });
    veiculo = { nome: v.nome, consumo_km_l: Number(v.consumo_km_l) };
  }

  const linha = {
    registro_id: registroId,
    data,
    cliente,
    descricao,
    valor_material: valorMaterial,
    veiculo_id: veiculoId,
    veiculo_nome: veiculo?.nome ?? null,
    consumo_km_l: veiculo?.consumo_km_l ?? null,
    km_rodados: km,
    preco_gasolina: precoGasolina,
    horas,
    valor_hora: valorHora,
    valor_servico: valorServico,
  };

  const { error } = id
    ? await supabase.from("custos_servico").update(linha).eq("id", id)
    : await supabase.from("custos_servico").insert(linha);
  if (error) {
    if (error.message.includes("custos_servico_registro_id_key")) {
      return falha("Este trabalho já tem gastos lançados. Edite o lançamento existente.", form, { registro_id: "Já lançado." });
    }
    return falha("Não foi possível salvar. Tente novamente.", form);
  }

  atualizar();
  return sucesso(id ? "Lançamento atualizado." : "Gastos lançados.");
}

export async function excluirLancamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("custos_servico").delete().eq("id", texto(form, "id")).select("id");
  if (error || !data?.length) return falha("Não foi possível excluir. Tente novamente.");
  atualizar();
  return sucesso("Lançamento excluído.");
}

export async function salvarConfiguracoes(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const erros: Record<string, string> = {};
  const precoGasolina = numero(form, "preco_gasolina", erros, { obrigatorio: true, rotulo: "preço da gasolina" });
  const valorHora = numero(form, "valor_hora_padrao", erros);
  if (precoGasolina > 100) erros.preco_gasolina = "Confira o preço do litro (ex.: 6,39).";
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("configuracoes").upsert({ id: 1, preco_gasolina: precoGasolina, valor_hora_padrao: valorHora });
  if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  atualizar();
  return sucesso("Valores atualizados. Os próximos lançamentos já usam os novos valores.");
}

export async function salvarVeiculo(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id");
  const nome = texto(form, "nome");
  const erros: Record<string, string> = {};
  if (!nome) erros.nome = "Informe o nome do carro.";
  else if (nome.length > 60) erros.nome = "Nome muito longo.";
  const consumo = numero(form, "consumo_km_l", erros, { obrigatorio: true, rotulo: "consumo (km/l)" });
  if (!erros.consumo_km_l && (consumo <= 0 || consumo > 100)) erros.consumo_km_l = "Informe quantos km o carro faz por litro (ex.: 11).";
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("veiculos").update({ nome, consumo_km_l: consumo }).eq("id", id)
    : await supabase.from("veiculos").insert({ nome, consumo_km_l: consumo });
  if (error) {
    if (error.message.includes("veiculos_nome_unico")) return falha("Já existe um carro com esse nome.", form, { nome: "Nome repetido." });
    return falha("Não foi possível salvar. Tente novamente.", form);
  }
  atualizar();
  return sucesso(id ? `${nome} atualizado.` : `${nome} adicionado.`);
}

export async function alterarVeiculoAtivo(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const ativo = texto(form, "ativo") === "true";
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("veiculos").update({ ativo }).eq("id", texto(form, "id")).select("nome").single();
  if (error || !data) return falha("Não foi possível alterar. Tente novamente.");
  atualizar();
  return sucesso(ativo ? `${data.nome} voltou para a lista.` : `${data.nome} saiu da lista de carros (lançamentos antigos continuam iguais).`);
}
