import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/esqueci-senha", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const redirecionar = (destino: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user) {
    if (publica) return response;
    return redirecionar("/login", pathname !== "/" ? { volta: pathname } : undefined);
  }

  if (pathname === "/login") return redirecionar("/");

  // Perfil: conta desativada sai; colaborador não entra em /admin
  if (!publica) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("role, ativo")
      .eq("id", user.id)
      .maybeSingle();

    if (!perfil || !perfil.ativo) {
      await supabase.auth.signOut();
      return redirecionar("/login", { erro: "inativo" });
    }
    if (pathname.startsWith("/admin") && perfil.role !== "admin") {
      return redirecionar("/");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
