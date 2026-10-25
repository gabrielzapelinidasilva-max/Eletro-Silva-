"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { entrar } from "./actions";
import { Campo } from "@/components/ui/Campo";
import { BotaoEnviar } from "@/components/ui/Botao";
import { RESULTADO_INICIAL } from "@/lib/tipos";

export function FormLogin({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, acao] = useActionState(entrar, RESULTADO_INICIAL);
  const mensagem = estado.mensagem || avisoInicial;

  return (
    <form action={acao} className="space-y-4" noValidate>
      {mensagem && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {mensagem}
        </p>
      )}
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" placeholder="seu@email.com" defaultValue={estado.valores?.email} erro={estado.erros?.email} obrigatorio />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" placeholder="Sua senha" erro={estado.erros?.senha} obrigatorio />
      <BotaoEnviar tamanho="lg" className="w-full" textoCarregando="Entrando...">
        <LogIn className="size-5" aria-hidden />
        Entrar
      </BotaoEnviar>
    </form>
  );
}
