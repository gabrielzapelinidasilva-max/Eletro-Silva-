// Controle de gastos: tipos, leitura de números digitados e cálculo do lucro.
// Usado no servidor (validação e listas) e no navegador (prévia ao digitar).

export type Configuracoes = { preco_gasolina: number; valor_hora_padrao: number };

export type Veiculo = { id: string; nome: string; consumo_km_l: number; ativo: boolean };

export type LancamentoCusto = {
  id: string;
  registro_id: string | null;
  data: string;
  cliente: string;
  descricao: string | null;
  valor_material: number;
  veiculo_id: string | null;
  veiculo_nome: string | null;
  km_rodados: number;
  consumo_km_l: number | null;
  preco_gasolina: number;
  horas: number;
  valor_hora: number;
  valor_servico: number;
  criado_em: string;
  /** Nome do eletricista, quando o lançamento veio de um registro. */
  colaborador: string | null;
  /** false quando veio de um registro em que o eletricista não informou o valor cobrado. */
  valor_servico_informado: boolean;
};

export type Calculo = {
  /** Valor cobrado pelo serviço + material (o material é da loja: entra como ganho). */
  receita: number;
  custoGasolina: number;
  litros: number;
  custoMaoDeObra: number;
  /** Gasolina + mão de obra. */
  custoTotal: number;
  lucro: number;
  /** Percentual de lucro sobre a receita (null se a receita for zero). */
  margem: number | null;
};

const arredondar = (n: number) => Math.round(n * 100) / 100;

/**
 * Receita = valor do serviço + valor do material (o material é nosso, vira ganho).
 * Custos = gasolina (km ÷ km/l × preço do litro) + mão de obra (horas × valor da hora).
 * Lucro = receita − custos; % = lucro ÷ receita.
 */
export function calcular(l: {
  valor_material: number; km_rodados: number; consumo_km_l: number | null; preco_gasolina: number;
  horas: number; valor_hora: number; valor_servico: number;
}): Calculo {
  const litros = l.consumo_km_l && l.consumo_km_l > 0 ? l.km_rodados / l.consumo_km_l : 0;
  const custoGasolina = arredondar(litros * l.preco_gasolina);
  const custoMaoDeObra = arredondar(l.horas * l.valor_hora);
  const custoTotal = arredondar(custoGasolina + custoMaoDeObra);
  const receita = arredondar(l.valor_servico + l.valor_material);
  const lucro = arredondar(receita - custoTotal);
  const margem = receita > 0 ? (lucro / receita) * 100 : null;
  return { receita, custoGasolina, litros, custoMaoDeObra, custoTotal, lucro, margem };
}

/**
 * Lê um número digitado do jeito brasileiro: "1.234,56", "1234,56", "1234.56", "R$ 50".
 * Retorna null se estiver vazio ou inválido.
 */
export function lerNumero(texto: string | null | undefined): number | null {
  let t = String(texto ?? "").replace(/[R$\s]/g, "").trim();
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Horas digitadas como "3,5", "3.5", "3:30" ou "3h30" → 3.5 */
export function lerHoras(texto: string | null | undefined): number | null {
  const t = String(texto ?? "").trim().toLowerCase();
  if (!t) return null;
  const hm = t.match(/^(\d{1,3})\s*[:h]\s*(\d{1,2})?$/);
  if (hm) {
    const min = Number(hm[2] ?? 0);
    return min < 60 ? Number(hm[1]) + min / 60 : null;
  }
  return lerNumero(t);
}

const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtNumero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatarMoeda(n: number): string {
  return fmtMoeda.format(n);
}

export function formatarNumero(n: number, casas = 2): string {
  return casas === 2 ? fmtNumero.format(n) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(n);
}

export function formatarMargem(m: number | null): string {
  return m == null ? "—" : `${m.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Número para preencher um campo de texto ("12,5"), vazio se zero. */
export function paraCampo(n: number | null | undefined, casas = 2): string {
  if (n == null || n === 0) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas, useGrouping: false });
}

/** Converte a linha do Supabase (com o registro do eletricista embutido, se houver). */
export function normalizarLancamento(l: Record<string, unknown>): LancamentoCusto {
  const n = (v: unknown) => (v == null ? 0 : Number(v));
  const reg = l.registros as { valor_servico: unknown; profiles: { nome: string } | null } | null | undefined;
  const { registros: _ignorar, ...resto } = l;
  void _ignorar;
  return {
    ...(resto as LancamentoCusto),
    valor_material: n(l.valor_material),
    km_rodados: n(l.km_rodados),
    consumo_km_l: l.consumo_km_l == null ? null : Number(l.consumo_km_l),
    preco_gasolina: n(l.preco_gasolina),
    horas: n(l.horas),
    valor_hora: n(l.valor_hora),
    valor_servico: n(l.valor_servico),
    colaborador: reg?.profiles?.nome ?? null,
    valor_servico_informado: l.registro_id ? reg?.valor_servico != null : true,
  };
}
