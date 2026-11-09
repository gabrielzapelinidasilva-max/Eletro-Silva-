"use client";

import type { MarketKind, Quote } from "@/lib/market-shared";

async function getJSON<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Sem conexão para buscar a cotação.");
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Não foi possível buscar a cotação.");
  return body;
}

/** Cotação atual e preço na data do aporte. */
export function lookupQuote(ticker: string, type: MarketKind, date: string) {
  const q = new URLSearchParams({ ticker, type, date });
  return getJSON<{ quote: Quote; priceAtDate: number | null }>(`/api/mercado?${q}`);
}

/** Cotações atuais de vários ativos ("PETR4:Ações"). */
export async function fetchQuotes(keys: string[]) {
  if (!keys.length) return {} as Record<string, Quote | null>;
  const q = new URLSearchParams({ list: keys.join(",") });
  const { quotes } = await getJSON<{ quotes: Record<string, Quote | null> }>(`/api/mercado?${q}`);
  return quotes;
}
