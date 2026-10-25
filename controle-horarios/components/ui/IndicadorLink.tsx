"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Coloque dentro de um <Link>: mostra um "carregando" enquanto a página de destino abre.
 * (Usado no lugar de loading.tsx, que trava a navegação entre filtros da mesma página no Next 15.)
 */
export function IndicadorLink({ className = "size-4" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className={`${className} animate-spin`} aria-label="Carregando" /> : null;
}
