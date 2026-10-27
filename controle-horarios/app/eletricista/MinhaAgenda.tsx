import Link from "next/link";
import { CalendarDays, LogIn, MapPin, Phone } from "lucide-react";
import { TituloSecao } from "@/components/ui/Cartao";
import { classesBotao } from "@/components/ui/estilos";
import { dataPorExtenso, formatarHora } from "@/lib/datas";
import { linkMapa, linkTelefone, type Agendamento } from "@/lib/agenda";

/** Próximos serviços agendados para o eletricista (o admin agenda na aba Agenda). */
export function MinhaAgenda({ itens, hoje, podeIniciar }: { itens: Agendamento[]; hoje: string; podeIniciar: boolean }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <TituloSecao><span className="flex items-center gap-2"><CalendarDays className="size-5 text-marca-600" aria-hidden /> Minha agenda</span></TituloSecao>
      <ul className="space-y-2">
        {itens.map((a) => (
          <li key={a.id} className={`rounded-xl bg-white p-4 ring-1 ${a.data === hoje ? "ring-marca-300" : "ring-slate-200"}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${a.data === hoje ? "text-marca-700" : "text-slate-500"}`}>
              {a.data === hoje ? "Hoje" : dataPorExtenso(a.data)}{a.hora ? ` · ${formatarHora(a.hora)}` : ""}
            </p>
            <p className="mt-0.5 font-bold text-slate-900">{a.cliente}</p>
            {a.servico && <p className="text-sm text-slate-600">{a.servico}</p>}
            {a.observacoes && <p className="mt-0.5 text-xs text-slate-500">Obs.: {a.observacoes}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {a.endereco && (
                <a href={linkMapa(a.endereco)} target="_blank" rel="noopener" className={classesBotao("secundario", "md", "px-3")}>
                  <MapPin className="size-4" aria-hidden /> {a.endereco.length > 28 ? "Ver no mapa" : a.endereco}
                </a>
              )}
              {a.telefone && (
                <a href={linkTelefone(a.telefone)} className={classesBotao("secundario", "md", "px-3")}>
                  <Phone className="size-4" aria-hidden /> Ligar
                </a>
              )}
              {a.data === hoje && podeIniciar && (
                <Link href={`/eletricista?cliente=${encodeURIComponent(a.cliente)}#chegada`} className={classesBotao("primario", "md", "px-3")}>
                  <LogIn className="size-4" aria-hidden /> Iniciar
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
