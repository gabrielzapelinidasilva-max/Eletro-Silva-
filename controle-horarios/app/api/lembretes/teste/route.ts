import { NextResponse } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { enviarPush, pushConfigurado, type Inscricao } from "@/lib/push-servidor";

export const dynamic = "force-dynamic";

/** "Enviar teste": manda uma notificação para os celulares do próprio usuário logado. */
export async function POST() {
  const perfil = await obterPerfil();
  if (!perfil?.ativo) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  if (!pushConfigurado()) return NextResponse.json({ erro: "As notificações ainda não foram configuradas no servidor." }, { status: 503 });
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("push_inscricoes").select("endpoint, p256dh, auth").eq("usuario_id", perfil.id).eq("ativa", true);
  if (!data?.length) return NextResponse.json({ erro: "Este celular ainda não ativou os lembretes." }, { status: 404 });
  const r = await enviarPush(data as Inscricao[], { titulo: "Teste de lembrete", corpo: `Tudo certo, ${perfil.nome.split(" ")[0]}! Você vai receber os lembretes de chegada e saída.`, tag: "teste" });
  return NextResponse.json(r);
}
