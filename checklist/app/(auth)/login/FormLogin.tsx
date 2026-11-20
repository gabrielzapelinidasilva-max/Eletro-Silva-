"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Aviso } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { mensagemErro } from "@/lib/utils";

export function FormLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(
    params.get("erro") === "inativo" ? "Seu acesso está desativado. Fale com um administrador." : "",
  );

  // Link de convite/recuperação que caiu aqui (ex.: Site URL) -> encaminha para a confirmação
  useEffect(() => {
    const h = window.location.hash;
    if (/access_token=|error_description=/.test(h)) window.location.replace("/auth/confirmar" + h);
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await criarClienteNavegador().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro(mensagemErro(error));
      setCarregando(false);
      return;
    }
    const volta = params.get("volta");
    router.replace(volta && volta.startsWith("/") && !volta.startsWith("//") ? volta : "/");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <h1 className="text-xl font-bold">Entrar</h1>
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" required className="campo"
               value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" required className="campo"
               value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <Aviso>{erro}</Aviso>
      <button type="submit" className="btn-primario w-full" disabled={carregando}>
        {carregando ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="font-medium text-primaria hover:underline">Esqueci minha senha</Link>
      </p>
    </form>
  );
}
