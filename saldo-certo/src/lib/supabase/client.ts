import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente Supabase do navegador (singleton). */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
