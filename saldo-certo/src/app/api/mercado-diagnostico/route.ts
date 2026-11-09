// TEMPORÁRIO: só para testar o acesso às cotações a partir da Vercel. Será removido.
import { NextResponse } from "next/server";
import { getPriceAt, getQuote } from "@/lib/market";

export async function GET() {
  const out: Record<string, unknown> = {};
  for (const [t, k] of [["PETR4", "Ações"], ["MXRF11", "FIIs"], ["BTC", "Cripto"], ["AAPL", "Ações"], ["XXXX9", "Ações"]] as const) {
    try {
      out[`${t}`] = { quote: await getQuote(t, k), priceAt20260105: await getPriceAt(t, k, "2026-01-05") };
    } catch (e) {
      out[`${t}`] = { error: String(e) };
    }
  }
  return NextResponse.json(out);
}
