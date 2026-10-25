import { dataValida, horaValida } from "./datas";
import { minutosEntre } from "./horas";

export type DadosRegistro = {
  data: string;
  hora_chegada: string;
  hora_saida: string | null;
  cliente: string;
  servico: string | null;
  observacoes: string | null;
};

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? "").trim();
}

/** Lê os campos do formulário de registro. */
export function lerRegistro(form: FormData): DadosRegistro {
  return {
    data: texto(form, "data"),
    hora_chegada: texto(form, "hora_chegada"),
    hora_saida: texto(form, "hora_saida") || null,
    cliente: texto(form, "cliente"),
    servico: texto(form, "servico") || null,
    observacoes: texto(form, "observacoes") || null,
  };
}

/**
 * Valida um registro. `exigirSaida` é usado ao registrar a saída, quando a hora de
 * saída e o serviço passam a ser obrigatórios.
 */
export function validarRegistro(d: DadosRegistro, { exigirSaida = false } = {}): Record<string, string> {
  const erros: Record<string, string> = {};
  if (!dataValida(d.data)) erros.data = "Informe uma data válida.";
  if (!horaValida(d.hora_chegada)) erros.hora_chegada = "Informe a hora de chegada.";
  if (exigirSaida && !d.hora_saida) erros.hora_saida = "Informe a hora de saída.";
  if (d.hora_saida && !horaValida(d.hora_saida)) erros.hora_saida = "Hora de saída inválida.";
  if (!erros.hora_chegada && d.hora_saida && !erros.hora_saida && minutosEntre(d.hora_chegada, d.hora_saida) < 0) {
    erros.hora_saida = "A hora de saída não pode ser antes da chegada.";
  }
  if (!d.cliente) erros.cliente = "Informe o cliente.";
  else if (d.cliente.length > 200) erros.cliente = "Nome do cliente muito longo (máx. 200 caracteres).";
  if ((exigirSaida || d.hora_saida) && !d.servico) erros.servico = "Descreva o serviço realizado.";
  if (d.servico && d.servico.length > 2000) erros.servico = "Texto muito longo (máx. 2000 caracteres).";
  if (d.observacoes && d.observacoes.length > 5000) erros.observacoes = "Texto muito longo (máx. 5000 caracteres).";
  return erros;
}

/** Traduz erros do banco para mensagens amigáveis. */
export function mensagemErroBanco(erro: { message?: string; code?: string } | null): string {
  const msg = erro?.message ?? "";
  if (msg.includes("registros_um_aberto_por_usuario")) return "Já existe uma chegada sem saída registrada. Registre a saída primeiro.";
  if (msg.includes("saida_depois_da_chegada")) return "A hora de saída não pode ser antes da chegada.";
  if (msg.includes("servico_obrigatorio_na_saida")) return "Descreva o serviço realizado.";
  if (msg.includes("row-level security") || erro?.code === "42501") return "Você não tem permissão para fazer isso.";
  return "Não foi possível salvar. Tente novamente.";
}
