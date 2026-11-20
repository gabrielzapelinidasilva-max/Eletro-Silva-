"use server";

import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Server Actions da área de usuários.
 * As operações privilegiadas (convidar, mudar papel, desativar, remover) rodam na
 * Edge Function "admin-usuarios", que usa a SERVICE_ROLE_KEY do próprio Supabase.
 * A chave nunca passa pelo navegador nem pela Vercel. Aqui conferimos que quem chamou
 * é admin; a função confere de novo do lado dela.
 */

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "colaborador";
  ativo: boolean;
  is_owner: boolean;
  created_at: string;
  ultimo_acesso: string | null;
  pendente: boolean;
};

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

async function urlBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function chamar<T>(corpo: Record<string, unknown>): Promise<Resultado<T>> {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const { data: perfil } = await supabase.from("profiles").select("role, ativo").eq("id", user.id).maybeSingle();
  if (!perfil || perfil.role !== "admin" || !perfil.ativo) {
    return { ok: false, erro: "Somente administradores podem fazer isso." };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    },
    body: JSON.stringify({ ...corpo, redirectTo: `${await urlBase()}/auth/confirmar` }),
    cache: "no-store",
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, erro: json.erro ?? json.message ?? `Erro ${resp.status}` };
  return { ok: true, ...json } as Resultado<T>;
}

export async function listarUsuarios() {
  return chamar<{ usuarios: Usuario[] }>({ acao: "listar" });
}

export async function convidarPessoa(nome: string, email: string, role: "admin" | "colaborador") {
  return chamar<{ emailEnviado: boolean; link?: string; aviso?: string }>({ acao: "convidar", nome, email, role });
}

export async function alterarPapel(id: string, role: "admin" | "colaborador") {
  return chamar({ acao: "alterar_papel", id, role });
}

export async function alterarStatus(id: string, ativo: boolean) {
  return chamar({ acao: "alterar_status", id, ativo });
}

export async function removerPessoa(id: string) {
  return chamar({ acao: "remover", id });
}

export async function gerarLinkAcesso(id: string) {
  return chamar<{ link: string }>({ acao: "gerar_link", id });
}
