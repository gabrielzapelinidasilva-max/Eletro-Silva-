"use client";

import { useState } from "react";
import { Aviso } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { mensagemErro } from "@/lib/utils";

export default function DefinirSenha() {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As senhas não são iguais.");
    setCarregando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro(mensagemErro(error));
    window.location.replace("/");
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <h1 className="text-xl font-bold">Crie sua senha</h1>
      <p className="text-sm text-black/60">Você vai usar esta senha junto com seu e-mail para entrar.</p>
      <div>
        <label htmlFor="senha" className="rotulo">Nova senha</label>
        <input id="senha" type="password" autoComplete="new-password" required minLength={8} className="campo"
               value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <div>
        <label htmlFor="confirma" className="rotulo">Repita a senha</label>
        <input id="confirma" type="password" autoComplete="new-password" required className="campo"
               value={confirma} onChange={(e) => setConfirma(e.target.value)} />
      </div>
      <Aviso>{erro}</Aviso>
      <button className="btn-primario w-full" disabled={carregando}>{carregando ? "Salvando…" : "Salvar e entrar"}</button>
    </form>
  );
}
