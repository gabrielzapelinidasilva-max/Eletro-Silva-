export type Funcao = "admin" | "eletricista";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funcao: Funcao;
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
  criado_em: string;
  atualizado_em: string;
};

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
