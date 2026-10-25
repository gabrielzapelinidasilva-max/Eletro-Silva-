import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/server";
import type { Perfil } from "./tipos";

/** Perfil do usuário logado (ou null). Memorizado durante a renderização. */
export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Perfil | null) ?? null;
});

export function rotaInicial(perfil: Perfil): string {
  return perfil.funcao === "admin" ? "/admin" : "/eletricista";
}

/** Garante um usuário ativo logado; senão manda para o login. */
export async function exigirLogin(): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/login");
  if (!perfil.ativo) redirect("/login?erro=inativo");
  return perfil;
}

export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirLogin();
  if (perfil.funcao !== "admin") redirect("/eletricista");
  return perfil;
}

export async function exigirEletricista(): Promise<Perfil> {
  const perfil = await exigirLogin();
  if (perfil.funcao !== "eletricista") redirect("/admin");
  return perfil;
}
