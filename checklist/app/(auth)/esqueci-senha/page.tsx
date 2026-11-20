"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Aviso } from "@/components/ui";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/client";
import { mensagemErro } from "@/lib/utils";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    // Fluxo "implicit": o link funciona mesmo se for aberto em outro aparelho (ex.: e-mail no celular).
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: "implicit", persistSession: false, detectSessionInUrl: false },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${base}/auth/confirmar?proximo=/definir-senha`,
    });
    setCarregando(false);
    if (error) return setErro(mensagemErro(error));
    setEnviado(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Esqueci minha senha</h1>
      {enviado ? (
        <Aviso tipo="ok">
          Se este e-mail tiver acesso, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.
        </Aviso>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-black/60">Informe seu e-mail e enviaremos um link para você criar uma nova senha.</p>
          <div>
            <label htmlFor="email" className="rotulo">E-mail</label>
            <input id="email" type="email" autoComplete="email" inputMode="email" required className="campo"
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Aviso>{erro}</Aviso>
          <button className="btn-primario w-full" disabled={carregando}>{carregando ? "Enviando…" : "Enviar link"}</button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primaria hover:underline">Voltar para o login</Link>
      </p>
    </div>
  );
}
