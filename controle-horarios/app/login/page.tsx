import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { FormLogin } from "./FormLogin";
import { obterPerfil, rotaInicial } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  if (supabaseConfigurado()) {
    const perfil = await obterPerfil();
    if (perfil?.ativo) redirect(rotaInicial(perfil));
  }

  const aviso = erro === "inativo" ? "Seu acesso está desativado. Fale com o administrador." : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-marca-800 via-marca-600 to-marca-500 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <Logo className="h-24 w-auto" />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Eletro Silva</h1>
          <p className="mt-1 text-base font-medium text-marca-100">Controle de Horários</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-5 text-lg font-bold text-slate-900">Acesse sua conta</h2>
          <FormLogin avisoInicial={aviso} />
          {!supabaseConfigurado() && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
              Configuração pendente: preencha as variáveis do Supabase (veja o README).
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-marca-100">Esqueceu a senha? Peça ao administrador para redefinir.</p>
      </div>
    </main>
  );
}
