"use client";

import { useId } from "react";

const BASE =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-3 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset disabled:bg-slate-100 disabled:text-slate-500";

function classesEntrada(erro?: string) {
  return `${BASE} ${erro ? "ring-red-400 focus:ring-red-500" : "ring-slate-300 focus:ring-marca-600"}`;
}

type Comum = { rotulo: string; erro?: string; ajuda?: string; obrigatorio?: boolean };

function Moldura({ id, rotulo, erro, ajuda, obrigatorio, children }: Comum & { id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-sm font-medium text-red-600">{erro}</p>
      ) : ajuda ? (
        <p className="text-xs text-slate-500">{ajuda}</p>
      ) : null}
    </div>
  );
}

export function Campo({ rotulo, erro, ajuda, obrigatorio, id, className = "", ...props }: Comum & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <input id={campoId} required={obrigatorio} aria-invalid={!!erro} aria-describedby={erro ? `${campoId}-erro` : undefined} className={`${classesEntrada(erro)} ${className}`} {...props} />
    </Moldura>
  );
}

export function AreaTexto({ rotulo, erro, ajuda, obrigatorio, id, ...props }: Comum & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <textarea id={campoId} rows={3} required={obrigatorio} aria-invalid={!!erro} aria-describedby={erro ? `${campoId}-erro` : undefined} className={classesEntrada(erro)} {...props} />
    </Moldura>
  );
}

export function Selecao({ rotulo, erro, ajuda, obrigatorio, id, children, ...props }: Comum & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} ajuda={ajuda} obrigatorio={obrigatorio}>
      <select id={campoId} required={obrigatorio} aria-invalid={!!erro} className={classesEntrada(erro)} {...props}>
        {children}
      </select>
    </Moldura>
  );
}
