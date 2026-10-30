"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { formatarData, somarDias } from "@/lib/datas";
import { ultimoDiaDoMes, nomeMes } from "@/lib/fixos";
import { DIAS_SEMANA, MAX_DIAS_OBRA, diaDaSemana, diasPelaSemana } from "@/lib/obras";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function mesVizinho(mes: string, passo: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + passo, 1)).toISOString().slice(0, 10);
}

/** Lista curta das datas: "30/10, 31/10, 03/11 ... e mais 12". */
function previa(datas: string[]) {
  const curtas = datas.slice(0, 6).map((d) => formatarData(d).slice(0, 5)).join(", ");
  return datas.length > 6 ? `${curtas} … e mais ${datas.length - 6}` : curtas;
}

/**
 * Escolha dos dias de um serviço em andamento:
 * - "Dias da semana": ex.: segunda a sexta, a partir de uma data, por N dias;
 * - "Escolher no calendário": tocar nos dias do mês (com atalhos para o mês inteiro).
 * Envia as datas escolhidas em campos "datas".
 */
export function EscolherDias({ hoje, inicio: inicioPadrao, erro }: { hoje: string; inicio?: string; erro?: string }) {
  const [modo, setModo] = useState<"semana" | "calendario">("semana");
  const [semana, setSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [inicio, setInicio] = useState(inicioPadrao ?? hoje);
  const [quantidade, setQuantidade] = useState("5");
  const [mes, setMes] = useState(`${(inicioPadrao ?? hoje).slice(0, 7)}-01`);
  const [marcadas, setMarcadas] = useState<string[]>([]);

  const datas = modo === "semana" ? diasPelaSemana(inicio || hoje, semana, Number(quantidade) || 0) : [...marcadas].sort();

  const doMes: string[] = [];
  for (let d = mes; d <= ultimoDiaDoMes(mes); d = somarDias(d, 1)) doMes.push(d);
  const alternar = (d: string) => setMarcadas((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]));
  const marcarMes = (so: (d: string) => boolean) => setMarcadas((l) => [...new Set([...l, ...doMes.filter((d) => d >= hoje && so(d))])]);
  const aba = (alvo: typeof modo, rotulo: string) => (
    <button type="button" onClick={() => setModo(alvo)} aria-pressed={modo === alvo}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${modo === alvo ? "bg-white text-marca-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500"}`}>
      {rotulo}
    </button>
  );
  const chip = (ativo: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${ativo ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`;

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">Dias de trabalho <span className="text-red-600">*</span></legend>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {aba("semana", "Dias da semana")}
        {aba("calendario", "Escolher no calendário")}
      </div>

      {modo === "semana" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
            {DIAS_SEMANA.map((d) => (
              <button key={d.valor} type="button" aria-pressed={semana.includes(d.valor)} className={chip(semana.includes(d.valor))}
                onClick={() => setSemana((l) => (l.includes(d.valor) ? l.filter((x) => x !== d.valor) : [...l, d.valor]))}>
                {d.curto}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(false)} onClick={() => setSemana([1, 2, 3, 4, 5])}>Segunda a sexta</button>
            <button type="button" className={chip(false)} onClick={() => setSemana([1, 2, 3, 4, 5, 6])}>Segunda a sábado</button>
            <button type="button" className={chip(false)} onClick={() => setSemana([1, 2, 3, 4, 5, 6, 7])}>Todos os dias</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Começa em" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <Campo rotulo="Quantos dias" type="number" inputMode="numeric" min={1} max={MAX_DIAS_OBRA} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMes(mesVizinho(mes, -1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Mês anterior"><ChevronLeft className="size-5" /></button>
            <p className="text-sm font-bold text-slate-900">{cap(nomeMes(mes))}</p>
            <button type="button" onClick={() => setMes(mesVizinho(mes, 1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Próximo mês"><ChevronRight className="size-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA.map((d) => <span key={d.valor} className="text-[10px] font-bold uppercase text-slate-400">{d.curto}</span>)}
            {Array.from({ length: diaDaSemana(mes) - 1 }, (_, i) => <span key={`v${i}`} />)}
            {doMes.map((d) => {
              const ativo = marcadas.includes(d);
              const passado = d < hoje;
              return (
                <button key={d} type="button" onClick={() => alternar(d)} aria-pressed={ativo} aria-label={formatarData(d)}
                  className={`h-10 rounded-lg text-sm font-semibold tabular-nums ${ativo ? "bg-marca-600 text-white" : passado ? "text-slate-300 hover:bg-slate-50" : "text-slate-700 ring-1 ring-slate-200 hover:bg-marca-50"} ${d === hoje && !ativo ? "ring-2 ring-marca-400" : ""}`}>
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(false)} onClick={() => marcarMes((d) => diaDaSemana(d) <= 5)}>Dias úteis do mês</button>
            <button type="button" className={chip(false)} onClick={() => marcarMes(() => true)}>Mês inteiro</button>
            {marcadas.length > 0 && <button type="button" className={chip(false)} onClick={() => setMarcadas([])}>Limpar</button>}
          </div>
        </div>
      )}

      {datas.map((d) => <input key={d} type="hidden" name="datas" value={d} />)}
      <p className={`rounded-lg px-3 py-2 text-xs ${datas.length ? "bg-marca-50 text-marca-900" : "bg-slate-50 text-slate-500"}`}>
        {datas.length ? <><strong>{datas.length} {datas.length === 1 ? "dia" : "dias"}:</strong> {previa(datas)}</> : "Nenhum dia escolhido."}
      </p>
      {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
    </fieldset>
  );
}
