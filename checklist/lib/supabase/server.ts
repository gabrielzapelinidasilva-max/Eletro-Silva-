import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o middleware renova a sessão.
          }
        },
      },
    },
  );
}

export type Perfil = {
  id: string;
  nome: string;
  role: "admin" | "colaborador";
  ativo: boolean;
  is_owner: boolean;
};

/** Usuário logado + perfil (ou null). */
export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, role, ativo, is_owner")
    .eq("id", user.id)
    .maybeSingle<Perfil>();
  if (!perfil) return null;
  return { user, perfil, supabase };
}
