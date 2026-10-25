"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { falha } from "@/lib/resultado";
import type { Resultado } from "@/lib/tipos";

export async function entrar(_anterior: Resultado, form: FormData): Promise<Resultado> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  const erros: Record<string, string> = {};
  if (!email) erros.email = "Informe o seu e-mail.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) erros.email = "E-mail inválido.";
  if (!senha) erros.senha = "Informe a sua senha.";
  if (Object.keys(erros).length) return falha("Confira os campos destacados.", form, erros);

  if (!supabaseConfigurado()) {
    return falha("O sistema ainda não foi configurado (variáveis do Supabase ausentes).", form);
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    const banido = error?.message?.toLowerCase().includes("banned");
    return falha(banido ? "Seu acesso está desativado. Fale com o administrador." : "E-mail ou senha incorretos.", form);
  }

  const { data: perfil } = await supabase.from("profiles").select("funcao, ativo").eq("id", data.user.id).single();
  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    return falha("Seu acesso está desativado. Fale com o administrador.", form);
  }

  redirect(perfil.funcao === "admin" ? "/admin" : "/eletricista");
}
