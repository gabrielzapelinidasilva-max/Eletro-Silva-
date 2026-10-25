import { Inbox, Loader2 } from "lucide-react";

export function EstadoVazio({ titulo, texto, children }: { titulo: string; texto?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
      <Inbox className="size-10 text-marca-300" aria-hidden />
      <p className="mt-3 font-semibold text-slate-700">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <Loader2 className="size-6 animate-spin text-marca-600" aria-hidden />
      <span className="font-medium">{texto}</span>
    </div>
  );
}

export function Selo({ cor, children }: { cor: "verde" | "cinza" | "azul" | "ambar"; children: React.ReactNode }) {
  const cores = {
    verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cinza: "bg-slate-100 text-slate-600 ring-slate-200",
    azul: "bg-marca-50 text-marca-700 ring-marca-200",
    ambar: "bg-amber-50 text-amber-800 ring-amber-200",
  }[cor];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cores}`}>{children}</span>;
}
