"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, MapPin, Repeat, RotateCcw, Search, User } from "lucide-react";
import { alterarStatusAgendamentos } from "./actions";
import { Botao } from "@/components/ui/Botao";
import { EstadoVazio } from "@/components/ui/Estados";
import { classesBotao } from "@/components/ui/estilos";
import { useToast } from "@/components/ui/Toast";
import { dataPorExtenso, formatarData, formatarHora } from "@/lib/datas";
import { linkMapa, type Agendamento } from "@/lib/agenda";
import { chaveNome } from "@/lib/clientes";

type Pessoa = { id: string; nome: string };

/** Junta os dias de uma mesma repetição em um item só (do mais recente para o mais antigo). */
function agrupar(itens: Agendamento[]) {
  const grupos = new Map<string, Agendamento[]>();
  for (const a of itens) {
    const chave = a.serie_id ?? a.id;
    grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
  }
  return [...grupos.values()];
}

/** Serviços da agenda marcados como concluídos, com busca e opção de reabrir. */
export function ListaConcluidos({ agendamentos, colaboradores }: { agendamentos: Agendamento[]; colaboradores: Pessoa[] }) {
  const [busca, setBusca] = useState("");
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  const nome = (id: string | null) => colaboradores.find((c) => c.id === id)?.nome ?? null;

  const termo = chaveNome(busca);
  const filtrados = termo
    ? agendamentos.filter((a) => chaveNome(`${a.cliente} ${a.servico ?? ""} ${a.endereco ?? ""} ${nome(a.colaborador_id) ?? ""}`).includes(termo))
    : agendamentos;
  const grupos = agrupar(filtrados);

  function reabrir(ids: string[]) {
    iniciar(async () => {
      const r = await alterarStatusAgendamentos(ids, "agendado");
      toast(r.ok ? "sucesso" : "erro", r.mensagem);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Serviços concluídos <span className="text-sm font-semibold text-slate-500">({grupos.length})</span></h2>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar serviço concluído</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, serviço ou eletricista"
            className="h-11 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-marca-500" />
        </label>
      </div>

      {grupos.length === 0 ? (
        <EstadoVazio
          titulo={agendamentos.length ? "Nada encontrado" : "Nenhum serviço concluído ainda"}
          texto={agendamentos.length ? "Tente outra busca." : "Quando o eletricista registrar a saída no cliente agendado (ou você tocar em “Concluir” no calendário), o serviço aparece aqui."}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {grupos.map((g) => {
            const a = g[0];
            const datas = [...g].sort((x, y) => x.data.localeCompare(y.data));
            return (
              <li key={a.serie_id ?? a.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1.5 font-bold text-slate-900">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden /> <span className="truncate">{a.cliente}</span>
                  </p>
                  {g.length > 1 && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500"><Repeat className="size-3.5" aria-hidden /> {g.length} dias</span>}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <CalendarDays className="size-4 shrink-0 text-slate-400" aria-hidden />
                  {g.length > 1 ? `${formatarData(datas[0].data)} a ${formatarData(datas[datas.length - 1].data)}` : dataPorExtenso(a.data)}
                  {a.hora ? ` · ${formatarHora(a.hora)}` : ""}
                </p>
                {nome(a.colaborador_id) && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600"><User className="size-4 shrink-0 text-slate-400" aria-hidden /> {nome(a.colaborador_id)}</p>}
                {a.endereco && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                    <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <a href={linkMapa(a.endereco)} target="_blank" rel="noopener" className="truncate text-marca-600 underline">{a.endereco}</a>
                  </p>
                )}
                {a.servico && <p className="mt-2 line-clamp-3 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">{a.servico}</p>}
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/admin/agenda?mes=${a.data.slice(0, 7)}`} className={classesBotao("fantasma", "md")}>
                    <CalendarDays className="size-4" aria-hidden /> Ver no calendário
                  </Link>
                  <Botao variante="secundario" disabled={pendente} onClick={() => reabrir(g.map((x) => x.id))}>
                    <RotateCcw className="size-4" aria-hidden /> Reabrir
                  </Botao>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
