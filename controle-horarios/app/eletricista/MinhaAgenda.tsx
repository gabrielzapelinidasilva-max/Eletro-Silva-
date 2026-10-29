import Link from "next/link";
import { CalendarDays, Clock, HardHat, Lock, LogIn, MapPin, Phone } from "lucide-react";
import { TituloSecao } from "@/components/ui/Cartao";
import { classesBotao } from "@/components/ui/estilos";
import { dataPorExtenso, formatarData, formatarHora } from "@/lib/datas";
import { linkMapa, linkTelefone, type Agendamento } from "@/lib/agenda";

const UM_DIA = 24 * 60 * 60 * 1000;

/** Selo "Novo" (agendado nas últimas 24 h) ou "Alterado" (o admin mudou nas últimas 24 h). */
function selo(a: Agendamento, agora: number) {
  const criado = a.criado_em ? Date.parse(a.criado_em) : 0;
  const alterado = a.atualizado_em ? Date.parse(a.atualizado_em) : 0;
  if (agora - criado < UM_DIA) return { texto: "Novo", classe: "bg-emerald-100 text-emerald-800" };
  if (alterado - criado > 60_000 && agora - alterado < UM_DIA) return { texto: "Alterado", classe: "bg-amber-100 text-amber-800" };
  return null;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="whitespace-pre-line text-sm text-slate-700">{children}</dd>
    </div>
  );
}

/** Junta os dias de um mesmo serviço em andamento (obra) em um cartão só. */
function agrupar(itens: Agendamento[]) {
  const grupos = new Map<string, Agendamento[]>();
  for (const a of itens) {
    const chave = a.obra_id ?? a.id;
    grupos.set(chave, [...(grupos.get(chave) ?? []), a]);
  }
  return [...grupos.values()];
}

/** Serviços agendados para o eletricista. Só leitura: quem agenda e altera é o administrador (aba Agenda). */
export function MinhaAgenda({ itens, hoje, podeIniciar }: { itens: Agendamento[]; hoje: string; podeIniciar: boolean }) {
  const agora = Date.now();
  return (
    <section>
      <TituloSecao><span className="flex items-center gap-2"><CalendarDays className="size-5 text-marca-600" aria-hidden /> Minha agenda</span></TituloSecao>
      <p className="-mt-1 mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="size-3.5 shrink-0" aria-hidden /> Serviços que o administrador agendou para você. Só ele pode alterar.
      </p>
      {itens.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Nenhum serviço agendado para você no momento.</p>
      ) : (
        <ul className="space-y-2">
          {agrupar(itens).map((grupo) => {
            const a = grupo[0];
            const s = grupo.map((x) => selo(x, agora)).find(Boolean) ?? null;
            const ehHoje = a.data === hoje;
            const obra = !!a.obra_id;
            return (
              <li key={a.obra_id ?? a.id} className={`rounded-xl bg-white p-4 ring-1 ${ehHoje ? "ring-marca-300" : "ring-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${ehHoje ? "text-marca-700" : "text-slate-500"}`}>
                    {obra && <span className="mb-0.5 flex items-center gap-1 text-marca-700"><HardHat className="size-3.5" aria-hidden /> Serviço em andamento · {grupo.length} {grupo.length === 1 ? "dia" : "dias"}</span>}
                    {obra ? "Próximo dia: " : ""}{ehHoje ? "Hoje" : dataPorExtenso(a.data)}
                  </p>
                  {s && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${s.classe}`}>{s.texto}</span>}
                </div>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{a.cliente}</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Campo rotulo="Horário">
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5 text-slate-400" aria-hidden />{a.hora ? formatarHora(a.hora) : "Sem horário definido"}</span>
                  </Campo>
                  {a.telefone && <Campo rotulo="Telefone">{a.telefone}</Campo>}
                  {a.endereco && <Campo rotulo="Endereço">{a.endereco}</Campo>}
                  {a.servico && <Campo rotulo="Serviço">{a.servico}</Campo>}
                  {a.observacoes && <Campo rotulo="Observações">{a.observacoes}</Campo>}
                </dl>
                {obra && grupo.length > 1 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dias</p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {grupo.slice(0, 12).map((x) => (
                        <span key={x.id} className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${x.data === hoje ? "bg-marca-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                          {x.data === hoje ? "Hoje" : formatarData(x.data).slice(0, 5)}
                        </span>
                      ))}
                      {grupo.length > 12 && <span className="px-1 text-xs text-slate-500">e mais {grupo.length - 12}</span>}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.endereco && (
                    <a href={linkMapa(a.endereco)} target="_blank" rel="noopener" className={classesBotao("secundario", "md", "px-3")}>
                      <MapPin className="size-4" aria-hidden /> Ver no mapa
                    </a>
                  )}
                  {a.telefone && (
                    <a href={linkTelefone(a.telefone)} className={classesBotao("secundario", "md", "px-3")}>
                      <Phone className="size-4" aria-hidden /> Ligar
                    </a>
                  )}
                  {ehHoje && podeIniciar && (
                    <Link href={`/eletricista?cliente=${encodeURIComponent(a.cliente)}#chegada`} className={classesBotao("primario", "md", "px-3")}>
                      <LogIn className="size-4" aria-hidden /> Iniciar
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
