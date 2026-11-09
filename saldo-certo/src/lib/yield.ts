/**
 * Cálculos de rendimento com juros compostos.
 * Valores brutos: não descontam imposto de renda, IOF nem taxas.
 */

export type RatePeriod = "mensal" | "anual";

export const RATE_PERIOD_LABEL: Record<RatePeriod, string> = {
  mensal: "ao mês",
  anual: "ao ano",
};
export const RATE_PERIOD_SHORT: Record<RatePeriod, string> = { mensal: "a.m.", anual: "a.a." };

/** Taxa em % (ex.: 12 para 12% ao ano) → taxa mensal equivalente em fração (ex.: 0,00949). */
export function monthlyRate(ratePercent: number, period: RatePeriod) {
  const r = ratePercent / 100;
  return period === "mensal" ? r : Math.pow(1 + r, 1 / 12) - 1;
}

export type YieldInput = {
  /** Valor aplicado no início. */
  initial: number;
  /** Aporte extra no fim de cada mês (opcional). */
  monthly?: number;
  ratePercent: number;
  period: RatePeriod;
  months: number;
};

export type YieldPoint = { month: number; invested: number; total: number; interest: number };

/** Evolução mês a mês (mês 0 = dia da aplicação). */
export function projectSeries({ initial, monthly = 0, ratePercent, period, months }: YieldInput): YieldPoint[] {
  const i = monthlyRate(ratePercent, period);
  const points: YieldPoint[] = [{ month: 0, invested: initial, total: initial, interest: 0 }];
  let total = initial;
  let invested = initial;
  for (let m = 1; m <= months; m++) {
    total = total * (1 + i) + monthly;
    invested += monthly;
    points.push({ month: m, invested: round2(invested), total: round2(total), interest: round2(total - invested) });
  }
  return points;
}

export function projectFinal(input: YieldInput) {
  const series = projectSeries(input);
  return series[series.length - 1];
}

/** Valor estimado de um aporte único depois de `months` meses. */
export function futureValue(amount: number, ratePercent: number, period: RatePeriod, months: number) {
  return round2(amount * Math.pow(1 + monthlyRate(ratePercent, period), months));
}

/** Meses completos entre duas datas "YYYY-MM-DD" (nunca negativo). */
export function monthsBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return Math.max(0, months);
}

/** "YYYY-MM-DD" + n meses (ajusta para o último dia do mês quando preciso). */
export function addMonthsToDate(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** "18 meses" → "1 ano e 6 meses". */
export function formatTerm(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? "ano" : "anos"}`);
  if (m) parts.push(`${m} ${m === 1 ? "mês" : "meses"}`);
  return parts.join(" e ") || "0 meses";
}

/** Fração → "+12,3%" / "−4,5%" */
export function formatPct(fraction: number) {
  const pct = fraction * 100;
  const txt = Math.abs(pct).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${pct >= 0 ? "+" : "−"}${txt}%`;
}

/** 1.5 → "1,5%" */
export function formatRate(ratePercent: number) {
  return `${ratePercent.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
