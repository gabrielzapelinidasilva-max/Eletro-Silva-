import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { LEMBRETES, type TipoLembrete } from "@/lib/push";
import { enviarPush, pushConfigurado, type Inscricao } from "@/lib/push-servidor";

export const dynamic = "force-dynamic";

/**
 * Chamado pelo banco (pg_cron) nos horários dos lembretes.
 * Só aceita o pedido com a senha combinada (LEMBRETES_SEGREDO); o banco confere de novo.
 */
export async function POST(request: NextRequest) {
  const segredo = process.env.LEMBRETES_SEGREDO;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 401 });
  }
  if (!pushConfigurado()) return NextResponse.json({ erro: "Notificações não configuradas" }, { status: 503 });

  const { tipo } = (await request.json().catch(() => ({}))) as { tipo?: string };
  if (tipo !== "chegada" && tipo !== "saida") return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("lembretes_destinatarios", { p_segredo: segredo, p_tipo: tipo });
  if (error) return NextResponse.json({ erro: "Não foi possível ler os destinatários" }, { status: 500 });

  const msg = LEMBRETES[tipo as TipoLembrete];
  const r = await enviarPush((data ?? []) as Inscricao[], { ...msg, tag: `lembrete-${tipo}` });
  if (r.mortas.length) await supabase.rpc("lembretes_remover", { p_segredo: segredo, p_endpoints: r.mortas });
  return NextResponse.json({ tipo, destinatarios: data?.length ?? 0, ...r, mortas: r.mortas.length });
}
