export function Cartao({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>{children}</section>;
}

export function TituloSecao({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">{children}</h2>
      {acao}
    </div>
  );
}

/** Caixa com um número em destaque (ex.: total de horas). */
export function Indicador({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${destaque ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-slate-900 ring-slate-200 shadow-sm"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${destaque ? "text-marca-100" : "text-slate-500"}`}>{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{valor}</p>
      {detalhe && <p className={`mt-0.5 text-xs ${destaque ? "text-marca-100" : "text-slate-500"}`}>{detalhe}</p>}
    </div>
  );
}
