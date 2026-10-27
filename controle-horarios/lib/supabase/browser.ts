"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let cliente: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente do Supabase no navegador (usa a sessão do login). O RLS protege os dados. */
export function clienteNavegador() {
  if (!cliente) cliente = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cliente;
}
