import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPriceAt, getQuote, MARKET_TYPES, normalizeTicker, type MarketKind } from "@/lib/market";

/**
 * GET /api/mercado?ticker=PETR4&type=Ações[&date=2026-01-10]
 *   → { quote, priceAtDate }
 * GET /api/mercado?list=PETR4:Ações,BTC:Cripto
 *   → { quotes: { "PETR4:Ações": Quote | null, ... } }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const headers = { "Cache-Control": "private, max-age=300" };

  try {
    const list = params.get("list");
    if (list) {
      const pairs = [...new Set(list.split(","))].slice(0, 30).map((p) => {
        const [t, k] = p.split(":");
        return [p, normalizeTicker(t ?? ""), k as MarketKind] as const;
      });
      const entries = await Promise.all(
        pairs.map(async ([key, t, k]) => {
          if (!t || !MARKET_TYPES.includes(k)) return [key, null] as const;
          try {
            return [key, await getQuote(t, k)] as const;
          } catch {
            return [key, null] as const;
          }
        }),
      );
      return NextResponse.json({ quotes: Object.fromEntries(entries) }, { headers });
    }

    const ticker = normalizeTicker(params.get("ticker") ?? "");
    const kind = params.get("type") as MarketKind;
    const date = params.get("date");
    if (!ticker) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    if (!MARKET_TYPES.includes(kind)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Data inválida." }, { status: 400 });

    const quote = await getQuote(ticker, kind);
    if (!quote) return NextResponse.json({ error: `Não encontrei o código ${ticker}.` }, { status: 404 });
    const priceAtDate = date ? await getPriceAt(ticker, kind, date) : null;
    return NextResponse.json({ quote, priceAtDate }, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar a cotação.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
