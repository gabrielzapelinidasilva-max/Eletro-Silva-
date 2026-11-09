import "server-only";

/**
 * Cotações de mercado (ações e FIIs da B3, ações de fora e cripto) via Yahoo Finance.
 * Só roda no servidor. Todos os preços são devolvidos em R$.
 */

export type MarketKind = "Ações" | "FIIs" | "Cripto";
export const MARKET_TYPES: readonly MarketKind[] = ["Ações", "FIIs", "Cripto"];

export type Quote = {
  ticker: string;
  symbol: string;
  name: string;
  /** Moeda original do ativo (os preços abaixo já estão em R$). */
  currency: string;
  price: number;
  /** Variação dos últimos 12 meses, em fração (0,15 = +15%). */
  change12m: number | null;
  /** Ritmo mensal equivalente aos últimos 12 meses, em fração. */
  monthlyAvg: number | null;
  /** Data/hora da cotação (ISO). */
  asOf: string;
};

const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,19}$/;

export function normalizeTicker(raw: string) {
  const t = raw.trim().toUpperCase();
  return TICKER_RE.test(t) ? t : null;
}

/** Converte o código digitado no símbolo do Yahoo (PETR4 → PETR4.SA, BTC → BTC-BRL). */
export function toSymbol(ticker: string, kind: MarketKind) {
  if (kind === "Cripto") return ticker.includes("-") ? ticker : `${ticker}-BRL`;
  if (ticker.endsWith(".SA")) return ticker;
  // B3: 4 letras + 1 ou 2 dígitos (PETR4, ITUB4, MXRF11, BOVA11), com F opcional do fracionário.
  const b3 = ticker.match(/^([A-Z]{4}\d{1,2})F?$/);
  if (b3) return `${b3[1]}.SA`;
  return ticker; // ação de fora (AAPL, MSFT...)
}

type Chart = {
  meta: {
    currency?: string;
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    regularMarketTime?: number;
  };
  timestamp?: number[];
  indicators: { quote: { close: (number | null)[] }[] };
};

async function fetchChart(symbol: string, query: string): Promise<Chart | null> {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`;
  for (const host of ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"]) {
    try {
      const res = await fetch(host + path, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SaldoCerto/1.0)", Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return null;
      if (!res.ok) continue;
      const json = (await res.json()) as { chart?: { result?: Chart[] | null } };
      return json.chart?.result?.[0] ?? null;
    } catch {
      // tenta o próximo host
    }
  }
  throw new Error("Serviço de cotações indisponível no momento.");
}

/** Pares (timestamp, fechamento) válidos. */
function closes(chart: Chart) {
  const ts = chart.timestamp ?? [];
  const cl = chart.indicators.quote[0]?.close ?? [];
  return ts.map((t, i) => [t, cl[i]] as const).filter((p): p is readonly [number, number] => typeof p[1] === "number" && p[1] > 0);
}

/** Cotação de 1 unidade de `currency` em R$ (1 para BRL). */
async function fxNow(currency: string) {
  if (!currency || currency === "BRL") return 1;
  const chart = await fetchChart(`${currency}BRL=X`, "range=5d&interval=1d");
  const p = chart?.meta.regularMarketPrice;
  if (!p) throw new Error(`Sem câmbio para ${currency}.`);
  return p;
}

async function fxAt(currency: string, date: string) {
  if (!currency || currency === "BRL") return 1;
  const chart = await fetchChart(`${currency}BRL=X`, rangeAround(date));
  const pts = chart ? closes(chart) : [];
  const end = endOfDay(date);
  const before = pts.filter(([t]) => t <= end);
  return (before[before.length - 1] ?? pts[0])?.[1] ?? fxNow(currency);
}

function endOfDay(date: string) {
  return Math.floor(Date.parse(`${date}T23:59:59-03:00`) / 1000);
}

function rangeAround(date: string) {
  const end = endOfDay(date);
  return `period1=${end - 12 * 86400}&period2=${end + 86400}&interval=1d`;
}

/** Cotação atual + variação de 12 meses. Devolve null se o código não existir. */
export async function getQuote(ticker: string, kind: MarketKind): Promise<Quote | null> {
  const symbol = toSymbol(ticker, kind);
  const chart = await fetchChart(symbol, "range=1y&interval=1d");
  if (!chart?.meta.regularMarketPrice) return null;
  const currency = chart.meta.currency ?? "BRL";
  const fx = await fxNow(currency);
  const pts = closes(chart);
  const first = pts[0]?.[1];
  const priceLocal = chart.meta.regularMarketPrice;
  const change12m = first ? priceLocal / first - 1 : null;
  return {
    ticker,
    symbol,
    name: chart.meta.longName || chart.meta.shortName || ticker,
    currency,
    price: priceLocal * fx,
    change12m,
    monthlyAvg: change12m === null ? null : Math.pow(1 + change12m, 1 / 12) - 1,
    asOf: new Date((chart.meta.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

/** Preço de fechamento (em R$) no dia `date` ou no último pregão antes dele. */
export async function getPriceAt(ticker: string, kind: MarketKind, date: string): Promise<number | null> {
  const symbol = toSymbol(ticker, kind);
  const chart = await fetchChart(symbol, rangeAround(date));
  if (!chart) return null;
  const pts = closes(chart);
  const end = endOfDay(date);
  const before = pts.filter(([t]) => t <= end);
  const local = (before[before.length - 1] ?? pts[0])?.[1];
  if (!local) return null;
  return local * (await fxAt(chart.meta.currency ?? "BRL", date));
}
