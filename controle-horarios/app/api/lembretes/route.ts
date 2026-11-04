import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { LEMBRETES } from "@/lib/push";
import { enviarPush, gerarChavesVapid, type ChavesVapid, type Inscricao } from "@/lib/push-servidor";

export const dynamic = "force-dynamic";

/**
 * Chamado pelo banco (pg_cron) nos horários dos lembretes, e no "Enviar teste".
 * A senha vem do banco no cabeçalho e é conferida pelo próprio banco em cada consulta.
 * As chaves do Web Push ficam no banco: na primeira vez o site cria e guarda.
 */
export async function POST(request: NextRequest) {
  const segredo = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!segredo) return NextResponse.json({ erro: "Acesso negado" }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const chaves = await lerChaves(supabase, segredo);
  if (!chaves) return NextResponse.json({ erro: "Acesso negado" }, { status: 401 });

  const { tipo, usuario } = (await request.json().catch(() => ({}))) as { tipo?: string; usuario?: string };
  if (tipo === "iniciar") return NextResponse.json({ ok: true });
  if (tipo !== "chegada" && tipo !== "saida" && tipo !== "teste") return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });

  const { data, error } = await supabase.rpc("lembretes_destinatarios", { p_segredo: segredo, p_tipo: tipo, p_usuario: usuario ?? null });
  if (error) return NextResponse.json({ erro: "Não foi possível ler os destinatários" }, { status: 500 });
  const lista = (data ?? []) as Inscricao[];

  const msg = tipo === "teste"
    ? { titulo: "Teste de lembrete", corpo: `Tudo certo${lista[0]?.nome ? `, ${lista[0].nome.split(" ")[0]}` : ""}! Você vai receber os lembretes de chegada e saída.`, tag: "teste" }
    : { ...LEMBRETES[tipo], tag: `lembrete-${tipo}` };
  const r = await enviarPush(chaves, lista, msg);
  if (r.mortas.length) await supabase.rpc("lembretes_remover", { p_segredo: segredo, p_endpoints: r.mortas });
  return NextResponse.json({ tipo, destinatarios: lista.length, ...r, mortas: r.mortas.length });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = ReturnType<typeof createClient<any>>;

/** Lê as chaves (conferindo a senha); se ainda não existirem, cria e guarda. */
async function lerChaves(supabase: Supa, segredo: string): Promise<ChavesVapid | null> {
  const ler = async () => {
    const { data, error } = await supabase.rpc("lembretes_vapid", { p_segredo: segredo });
    if (error) return undefined;
    return (data as { publica: string | null; privada: string | null }[])?.[0];
  };
  let c = await ler();
  if (c === undefined) return null;
  if (!c?.publica || !c.privada) {
    const novas = gerarChavesVapid();
    await supabase.rpc("lembretes_salvar_vapid", { p_segredo: segredo, p_publica: novas.publica, p_privada: novas.privada });
    c = await ler(); // se dois pedidos chegaram juntos, vale a que ficou gravada
  }
  return c?.publica && c.privada ? { publica: c.publica, privada: c.privada } : null;
}
