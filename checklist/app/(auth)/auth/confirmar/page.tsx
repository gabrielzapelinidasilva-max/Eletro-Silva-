"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/client";
import { mensagemErro } from "@/lib/utils";

/**
 * Recebe os links de convite e de redefinição de senha.
 * Aceita os três formatos do Supabase: #access_token (convite/recuperação),
 * ?code (PKCE) e ?token_hash (modelos de e-mail personalizados).
 */
export default function Confirmar() {
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const sb = createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
        isSingleton: false,
        auth: { detectSessionInUrl: false },
      });
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const proximoParam = url.searchParams.get("proximo");
      let tipo = hash.get("type") ?? url.searchParams.get("type") ?? "";

      const erroUrl = hash.get("error_description") ?? url.searchParams.get("error_description");
      if (erroUrl) {
        const expirado = /expired|invalid/i.test(erroUrl);
        return setErro(expirado ? "Este link expirou ou já foi usado. Peça um novo." : erroUrl.replace(/\+/g, " "));
      }

      try {
        if (hash.get("access_token") && hash.get("refresh_token")) {
          const { error } = await sb.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          if (error) throw error;
        } else if (url.searchParams.get("code")) {
          const { error } = await sb.auth.exchangeCodeForSession(url.searchParams.get("code")!);
          if (error) throw error;
        } else if (url.searchParams.get("token_hash")) {
          const { error } = await sb.auth.verifyOtp({
            token_hash: url.searchParams.get("token_hash")!,
            type: (tipo || "invite") as EmailOtpType,
          });
          if (error) throw error;
          tipo = tipo || "invite";
        } else {
          return setErro("Link inválido. Peça um novo link.");
        }
      } catch (e) {
        return setErro(mensagemErro(e));
      }

      const precisaSenha = ["invite", "recovery", "signup"].includes(tipo);
      const destino = precisaSenha ? "/definir-senha" : proximoParam?.startsWith("/") ? proximoParam : "/";
      window.location.replace(destino);
    })();
  }, []);

  if (erro) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold">Não foi possível entrar</h1>
        <p className="text-sm text-black/60">{erro}</p>
        <Link href="/esqueci-senha" className="btn-primario w-full">Pedir novo link</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 py-6 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primaria/20 border-t-primaria" />
      <p className="text-sm text-black/60">Confirmando seu acesso…</p>
    </div>
  );
}
