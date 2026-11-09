/** Tipos e regras de mercado usados no navegador e no servidor. */

export type MarketKind = "Ações" | "FIIs" | "Cripto";
export const MARKET_TYPES: readonly MarketKind[] = ["Ações", "FIIs", "Cripto"];

export function isMarketType(type: string): type is MarketKind {
  return (MARKET_TYPES as readonly string[]).includes(type);
}

export type Quote = {
  ticker: string;
  symbol: string;
  name: string;
  /** Moeda original do ativo (os preços já estão em R$). */
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

export const TICKER_EXAMPLES: Record<MarketKind, string> = {
  Ações: "Ex.: PETR4, VALE3, ITUB4 ou AAPL",
  FIIs: "Ex.: MXRF11, HGLG11, KNRI11",
  Cripto: "Ex.: BTC, ETH, SOL",
};
