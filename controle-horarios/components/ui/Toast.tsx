"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import type { Resultado } from "@/lib/tipos";

type Tipo = "sucesso" | "erro";
type Item = { id: number; tipo: Tipo; texto: string };

const Contexto = createContext<(tipo: Tipo, texto: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const proximo = useRef(0);

  const fechar = useCallback((id: number) => setItens((l) => l.filter((i) => i.id !== id)), []);
  const mostrar = useCallback((tipo: Tipo, texto: string) => {
    const id = ++proximo.current;
    setItens((l) => [...l.slice(-2), { id, tipo, texto }]);
    setTimeout(() => fechar(id), 4500);
  }, [fechar]);

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-4 sm:items-end">
        {itens.map((i) => (
          <div
            key={i.id}
            role="status"
            className={`animar-entrada pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              i.tipo === "sucesso" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-red-50 text-red-900 ring-red-200"
            }`}
          >
            {i.tipo === "sucesso" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />}
            <span className="flex-1">{i.texto}</span>
            <button onClick={() => fechar(i.id)} aria-label="Fechar aviso" className="-m-1 rounded p-1 opacity-60 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  return useContext(Contexto);
}

/** Mostra um toast sempre que uma server action devolve um resultado novo. */
export function useToastDoResultado(resultado: Resultado, aoSucesso?: () => void) {
  const toast = useToast();
  const ultimo = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!resultado.mensagem || resultado.em === ultimo.current) return;
    ultimo.current = resultado.em;
    toast(resultado.ok ? "sucesso" : "erro", resultado.mensagem);
    if (resultado.ok) aoSucesso?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);
}
