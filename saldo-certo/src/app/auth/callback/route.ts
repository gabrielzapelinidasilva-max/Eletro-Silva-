import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Recebe os links de e-mail do Supabase (confirmação de conta e recuperação de senha). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/ganhos";
  // Só permite redirecionar para caminhos internos.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/ganhos";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  if (ok) return NextResponse.redirect(`${origin}${type === "recovery" ? "/redefinir-senha" : next}`);
  return NextResponse.redirect(`${origin}/login?erro=link`);
}
