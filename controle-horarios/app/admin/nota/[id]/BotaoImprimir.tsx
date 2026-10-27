"use client";

import { Printer } from "lucide-react";
import { Botao } from "@/components/ui/Botao";

export function BotaoImprimir() {
  return (
    <Botao tamanho="lg" onClick={() => window.print()}>
      <Printer className="size-5" aria-hidden /> Imprimir / salvar em PDF
    </Botao>
  );
}
