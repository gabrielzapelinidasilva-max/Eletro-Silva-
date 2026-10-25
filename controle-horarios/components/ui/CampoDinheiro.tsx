"use client";

import { Campo } from "./Campo";

/** Campo de valor em reais (aceita "150", "150,50", "1.250,00"). */
export function CampoDinheiro(props: React.ComponentProps<typeof Campo>) {
  return (
    <div className="relative">
      <Campo inputMode="decimal" placeholder="0,00" autoComplete="off" className="pl-10 tabular-nums" {...props} />
      <span className="pointer-events-none absolute left-3.5 top-[38px] text-sm font-semibold text-slate-400">R$</span>
    </div>
  );
}
