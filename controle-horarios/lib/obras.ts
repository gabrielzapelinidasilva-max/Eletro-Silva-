// Serviços em andamento (obras de vários dias).

import { somarDias } from "./datas";

export type Obra = {
  id: string;
  cliente: string;
  endereco: string | null;
  telefone: string | null;
  servico: string | null;
  observacoes: string | null;
  hora: string | null;
  status: "andamento" | "concluida";
  criado_em: string;
};

/** Dia de uma obra na agenda (um por eletricista e dia). */
export type DiaObra = { id: string; obra_id: string; data: string; colaborador_id: string | null; status: "agendado" | "concluido" | "cancelado" };

/** Limite de dias por vez (um ano). */
export const MAX_DIAS_OBRA = 366;

/** Dias da semana (1 = segunda ... 7 = domingo). */
export const DIAS_SEMANA = [
  { valor: 1, curto: "Seg" },
  { valor: 2, curto: "Ter" },
  { valor: 3, curto: "Qua" },
  { valor: 4, curto: "Qui" },
  { valor: 5, curto: "Sex" },
  { valor: 6, curto: "Sáb" },
  { valor: 7, curto: "Dom" },
];

/** "AAAA-MM-DD" → 1 (segunda) ... 7 (domingo). */
export function diaDaSemana(iso: string): number {
  return ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** Os próximos `quantidade` dias a partir de `inicio` que caem nos dias da semana escolhidos. */
export function diasPelaSemana(inicio: string, dias: number[], quantidade: number): string[] {
  const lista: string[] = [];
  if (!dias.length || quantidade < 1) return lista;
  const n = Math.min(quantidade, MAX_DIAS_OBRA);
  for (let d = inicio, guarda = 0; lista.length < n && guarda < 3 * 366; d = somarDias(d, 1), guarda++) {
    if (dias.includes(diaDaSemana(d))) lista.push(d);
  }
  return lista;
}
