"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cx, iniciais, porcentagem } from "@/lib/utils";

export function BarraProgresso({ feitos, total, fina = false }: { feitos: number; total: number; fina?: boolean }) {
  const pct = porcentagem(feitos, total);
  return (
    <div className="flex items-center gap-3">
      <div className={cx("flex-1 overflow-hidden rounded-full bg-bege/60", fina ? "h-1.5" : "h-2.5")}>
        <div
          className={cx("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-primaria")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums text-black/70">{pct}%</span>
    </div>
  );
}

export function Avatar({ nome, pequeno = false }: { nome: string; pequeno?: boolean }) {
  return (
    <span
      title={nome}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primaria-clara font-semibold text-primaria ring-2 ring-white",
        pequeno ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={aoFechar} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button className="btn-fantasma -mr-2 min-h-9 px-2" onClick={aoFechar} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok" | "info"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cx(
        "rounded-xl px-3.5 py-2.5 text-sm",
        tipo === "erro" && "bg-red-50 text-red-700",
        tipo === "ok" && "bg-emerald-50 text-emerald-800",
        tipo === "info" && "bg-primaria-clara text-primaria-escura",
      )}
    >
      {children}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="text-sm text-black/55">{children}</div>}
    </div>
  );
}
