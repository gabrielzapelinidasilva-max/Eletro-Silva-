import Link from "next/link";
import { CalendarDays, Clock, Lock, LogIn, MapPin, Phone } from "lucide-react";
import { TituloSecao } from "@/components/ui/Cartao";
import { classesBotao } from "@/components/ui/estilos";
import { dataPorExtenso, formatarHora } from "@/lib/datas";
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
          {itens.map((a) => {
            const s = selo(a, agora);
            const ehHoje = a.data === hoje;
            return (
              <li key={a.id} className={`rounded-xl bg-white p-4 ring-1 ${ehHoje ? "ring-marca-300" : "ring-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${ehHoje ? "text-marca-700" : "text-slate-500"}`}>
                    {ehHoje ? "Hoje" : dataPorExtenso(a.data)}
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
