export type Papel = "admin" | "colaborador";

export type PerfilResumo = { id: string; nome: string; role: Papel; ativo: boolean; is_owner: boolean };

export type Checklist = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
};

export type Item = {
  id: string;
  checklist_id: string;
  texto: string;
  posicao: number;
  responsavel_id: string | null;
  prazo: string | null;
  concluido: boolean;
  concluido_por: string | null;
  concluido_em: string | null;
  comentario: string | null;
  created_at: string;
};

export type Atividade = {
  id: number;
  checklist_id: string;
  item_id: string | null;
  user_id: string | null;
  acao: string;
  detalhe: string | null;
  created_at: string;
};

export type Modelo = { id: string; nome: string; descricao: string | null; created_at: string };
export type ItemModelo = { id: string; template_id: string; texto: string; posicao: number };
