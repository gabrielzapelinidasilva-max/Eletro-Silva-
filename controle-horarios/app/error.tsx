"use client";

import { Botao } from "@/components/ui/Botao";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold text-slate-700">Algo deu errado ao carregar esta página.</p>
      <p className="text-sm text-slate-500">Verifique sua conexão com a internet e tente de novo.</p>
      <Botao tamanho="lg" onClick={reset}>Tentar novamente</Botao>
    </main>
  );
}
