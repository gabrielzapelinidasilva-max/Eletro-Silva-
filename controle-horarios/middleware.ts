import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Renova a sessão do Supabase a cada requisição e protege as áreas:
 * - /eletricista e /admin exigem login;
 * - /admin exige função "admin" (o RLS no banco protege os dados de novo).
 */
export async function middleware(request: NextRequest) {
  if (!supabaseConfigurado()) return NextResponse.next();

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;
  const areaProtegida = caminho.startsWith("/admin") || caminho.startsWith("/eletricista");

  const redirecionar = (destino: string) => {
    const url = request.nextUrl.clone();
    const [path, query] = destino.split("?");
    url.pathname = path;
    url.search = query ? `?${query}` : "";
    const r = NextResponse.redirect(url);
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!areaProtegida) return resposta;
  if (!user) return redirecionar("/login");

  const { data: perfil } = await supabase.from("profiles").select("funcao, ativo").eq("id", user.id).single();
  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    return redirecionar("/login?erro=inativo");
  }
  if (caminho.startsWith("/admin") && perfil.funcao !== "admin") return redirecionar("/eletricista");
  if (caminho.startsWith("/eletricista") && perfil.funcao !== "eletricista") return redirecionar("/admin");

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.jpg|.*\\.(?:webp|jpg|png|svg)$).*)"],
};
