import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/cadastro", "/esqueci-senha", "/auth"];
const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha"];

function startsWithAny(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Renova a sessão do Supabase e protege as rotas do app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims().
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Mantém os cookies de sessão renovados.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !startsWithAny(pathname, PUBLIC_PATHS)) {
    // APIs respondem 401 em JSON em vez de redirecionar para a tela de login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
    }
    return redirectTo("/login");
  }
  if (isLoggedIn && (pathname === "/" || startsWithAny(pathname, AUTH_PAGES))) {
    return redirectTo("/ganhos");
  }

  return response;
}
