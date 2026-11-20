import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Cliente do navegador (usa só a chave pública; a segurança fica no RLS do banco). */
export function criarClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
