import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** "Enviar teste": o banco pede ao site uma notificação para os celulares de quem está logado. */
export async function POST() {
  const perfil = await obterPerfil();
  if (!perfil?.ativo) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  const supabase = await criarClienteServidor();
  const { count } = await supabase.from("push_inscricoes").select("id", { count: "exact", head: true }).eq("usuario_id", perfil.id).eq("ativa", true);
  if (!count) return NextResponse.json({ erro: "Este celular ainda não ativou os lembretes." }, { status: 404 });
  const { error } = await supabase.rpc("pedir_lembrete_teste");
  if (error) return NextResponse.json({ erro: "Não foi possível enviar o teste." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
