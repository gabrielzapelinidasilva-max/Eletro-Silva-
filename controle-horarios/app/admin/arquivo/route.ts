import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BUCKET_SERVICOS } from "@/lib/fotos";

/** Mostra uma foto/assinatura do Storage privado (só administrador): redireciona para um link temporário. */
export async function GET(request: NextRequest) {
  const perfil = await obterPerfil();
  if (!perfil?.ativo || perfil.funcao !== "admin") return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  const caminho = request.nextUrl.searchParams.get("p") ?? "";
  if (!caminho || caminho.includes("..")) return NextResponse.json({ erro: "Arquivo inválido" }, { status: 400 });
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.storage.from(BUCKET_SERVICOS).createSignedUrl(caminho, 600);
  if (error || !data) return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=300" } });
}
