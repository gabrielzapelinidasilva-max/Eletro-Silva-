import { CalendarDays, Clock, User } from "lucide-react";
import { Selo } from "@/components/ui/Estados";
import { formatarData, formatarHora } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import type { Registro } from "@/lib/tipos";

/** Cartão compacto de um registro (listas no celular). */
export function ItemRegistro({ registro, colaborador, acoes }: { registro: Registro; colaborador?: string; acoes?: React.ReactNode }) {
  const emAndamento = !registro.hora_saida;
  return (
    <li className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <CalendarDays className="size-4 text-marca-600" aria-hidden />
          {formatarData(registro.data)}
        </p>
        {emAndamento ? <Selo cor="verde">Em andamento</Selo> : <Selo cor="azul">{formatarMinutos(registro.minutos_trabalhados)}</Selo>}
      </div>
      {colaborador && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <User className="size-4 text-slate-400" aria-hidden /> {colaborador}
        </p>
      )}
      <p className="mt-2 font-bold text-slate-900">{registro.cliente}</p>
      {registro.servico && <p className="mt-0.5 line-clamp-3 text-sm text-slate-600">{registro.servico}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm tabular-nums text-slate-600">
          <Clock className="size-4 text-slate-400" aria-hidden />
          {formatarHora(registro.hora_chegada)} – {formatarHora(registro.hora_saida)}
        </p>
        {acoes && <div className="flex gap-2">{acoes}</div>}
      </div>
    </li>
  );
}
