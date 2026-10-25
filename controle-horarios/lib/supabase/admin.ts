import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/** A chave service_role está disponível? Sem ela, o app usa as funções admin_* do banco. */
export function serviceRoleConfigurada(): boolean {
  return Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Cliente com a chave service_role: ignora o RLS. Use SOMENTE no servidor e
 * SOMENTE depois de confirmar que quem pediu é um administrador.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada. Veja o README.");
  }
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
