"use client";

import { Check } from "lucide-react";
import type { PerfilResumo } from "@/lib/tipos";
import { cx } from "@/lib/utils";

/** Seleção múltipla de pessoas (responsáveis pelo checklist). */
export function SeletorPessoas({
  equipe,
  selecionados,
  aoMudar,
}: {
  equipe: PerfilResumo[];
  selecionados: string[];
  aoMudar: (ids: string[]) => void;
}) {
  const ativos = equipe.filter((p) => p.ativo);
  if (ativos.length === 0) return <p className="text-sm text-black/50">Nenhuma pessoa cadastrada ainda.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {ativos.map((p) => {
        const marcado = selecionados.includes(p.id);
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => aoMudar(marcado ? selecionados.filter((x) => x !== p.id) : [...selecionados, p.id])}
            className={cx(
              "chip min-h-9 border px-3 text-sm",
              marcado ? "border-primaria bg-primaria-clara text-primaria" : "border-black/10 bg-white text-black/70",
            )}
            aria-pressed={marcado}
          >
            {marcado && <Check className="h-3.5 w-3.5" />}
            {p.nome}
            {p.role === "admin" && <span className="text-[10px] uppercase opacity-60">admin</span>}
          </button>
        );
      })}
    </div>
  );
}
