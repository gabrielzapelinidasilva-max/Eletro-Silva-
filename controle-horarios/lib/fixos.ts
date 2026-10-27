// Gastos fixos por mês (salários, ferramentas, manutenção do carro...).

export type CategoriaFixo = "salario" | "ferramentas" | "manutencao_carro" | "outro";

export const CATEGORIAS: { valor: CategoriaFixo; rotulo: string }[] = [
  { valor: "salario", rotulo: "Salário" },
  { valor: "ferramentas", rotulo: "Ferramentas" },
  { valor: "manutencao_carro", rotulo: "Manutenção do carro" },
  { valor: "outro", rotulo: "Outro" },
];

export function rotuloCategoria(c: string): string {
  return CATEGORIAS.find((x) => x.valor === c)?.rotulo ?? "Outro";
}

/** Gasto fixo cadastrado (vale para todo mês enquanto estiver ativo). */
export type GastoFixo = { id: string; descricao: string; categoria: CategoriaFixo; valor: number; ativo: boolean };

/** Gasto fixo lançado em um mês já fechado. */
export type GastoFixoMes = { id: string; mes: string; descricao: string; categoria: CategoriaFixo; valor: number };

/** "2026-10-01" → "outubro de 2026" */
export function nomeMes(mes: string): string {
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${nomes[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
}

/** Último dia do mês de uma data "AAAA-MM-DD". */
export function ultimoDiaDoMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

export function normalizarFixo<T extends { valor: unknown }>(l: T): T & { valor: number } {
  return { ...l, valor: Number(l.valor) };
}
