export type Funcao = "admin" | "eletricista";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funcao: Funcao;
  /** Eletricista que também gerencia a Agenda. */
  encarregado?: boolean;
  ativo: boolean;
  criado_em: string;
};

export type Registro = {
  id: string;
  usuario_id: string;
  data: string; // AAAA-MM-DD
  hora_chegada: string; // HH:MM:SS
  hora_saida: string | null;
  cliente: string;
  servico: string | null;
  observacoes: string | null;
  minutos_trabalhados: number | null;
  /** Intervalo em andamento (hora em que começou) e minutos de intervalo já feitos. */
  intervalo_inicio?: string | null;
  minutos_intervalo?: number;
  // Dados para a aba Gastos (preenchidos pelo eletricista ao registrar a saída)
  veiculo_id: string | null;
  km_rodados: number;
  valor_material: number;
  /** null = não informado */
  valor_servico: number | null;
  // Anexos opcionais da saída (caminhos no Storage "servicos")
  fotos_antes: string[];
  fotos_depois: string[];
  assinatura: string | null;
  assinatura_nome: string | null;
  criado_em: string;
  atualizado_em: string;
};

/** Carro disponível para escolher no registro. */
export type VeiculoOpcao = { id: string; nome: string; consumo_km_l: number };

export type RegistroComPerfil = Registro & { profiles: Pick<Perfil, "nome"> | null };

/** Retorno padrão das server actions, exibido como toast e mensagens nos campos. */
export type Resultado = {
  ok: boolean;
  mensagem: string;
  erros?: Record<string, string>;
  /** O que foi digitado, para preencher o formulário de novo em caso de erro. */
  valores?: Record<string, string>;
  /** Muda a cada envio para o formulário saber que chegou uma resposta nova. */
  em?: number;
};

export const RESULTADO_INICIAL: Resultado = { ok: false, mensagem: "" };
