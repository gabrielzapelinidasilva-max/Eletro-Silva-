import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HardHat, AlertTriangle } from "lucide-react";
import { Cartao, Indicador, TituloSecao } from "@/components/ui/Cartao";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { ItemRegistro } from "@/components/registros/ItemRegistro";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarRegistros } from "@/lib/consultas";
import { formatarData, formatarDataHora, formatarHora, hojeSP, horaAgoraSP, inicioMes, inicioSemana } from "@/lib/datas";
import { formatarMinutos, minutosEntre, somarMinutos } from "@/lib/horas";
import type { RegistroComPerfil } from "@/lib/tipos";

export const metadata: Metadata = { title: "Resumo" };

export default async function Resumo() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();
  const semana = inicioSemana(hoje);
  const mes = inicioMes(hoje);

  const [periodo, { data: abertosData }, { data: ultimosData }, { count: ativos }] = await Promise.all([
    buscarRegistros(supabase, { colaborador: "", de: semana < mes ? semana : mes, ate: hoje, cliente: "", q: "" }),
    supabase.from("registros").select("*, profiles(nome)").is("hora_saida", null).order("data").order("hora_chegada"),
    supabase.from("registros").select("*, profiles(nome)").order("criado_em", { ascending: false }).limit(8),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("ativo", true).eq("funcao", "eletricista"),
  ]);

  const abertos = (abertosData ?? []) as RegistroComPerfil[];
  const ultimos = (ultimosData ?? []) as RegistroComPerfil[];
  const total = (desde: string) => formatarMinutos(somarMinutos(periodo.filter((r) => r.data >= desde)));
  const agora = horaAgoraSP();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Resumo</h1>
        <p className="text-slate-500">Visão geral da equipe em {formatarData(hoje)}.</p>
      </div>

      <section aria-label="Horas da equipe" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Trabalhando agora" valor={String(abertos.filter((r) => r.data === hoje).length)} detalhe={`de ${ativos ?? 0} eletricistas ativos`} destaque />
        <Indicador rotulo="Horas hoje" valor={total(hoje)} detalhe="atendimentos encerrados" />
        <Indicador rotulo="Horas na semana" valor={total(semana)} detalhe={`desde ${formatarData(semana)}`} />
        <Indicador rotulo="Horas no mês" valor={total(mes)} detalhe={`desde ${formatarData(mes)}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <TituloSecao>Quem está trabalhando agora</TituloSecao>
          {abertos.length === 0 ? (
            <EstadoVazio titulo="Ninguém em atendimento" texto="Quando um eletricista registrar chegada, ele aparece aqui." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {abertos.map((r) => {
                const esquecido = r.data !== hoje;
                return (
                  <li key={r.id} className="flex items-start gap-3 py-3">
                    <span className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full ${esquecido ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {esquecido ? <AlertTriangle className="size-5" aria-hidden /> : <HardHat className="size-5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{r.profiles?.nome ?? "—"}</p>
                      <p className="truncate text-sm text-slate-600">{r.cliente}</p>
                      {esquecido && <p className="mt-0.5 text-xs font-medium text-amber-700">Saída não registrada em {formatarData(r.data)}. Corrija na aba Registros.</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">desde {formatarHora(r.hora_chegada)}</p>
                      {!esquecido && minutosEntre(formatarHora(r.hora_chegada), agora) >= 0 && (
                        <Selo cor="verde">há {formatarMinutos(minutosEntre(formatarHora(r.hora_chegada), agora))}</Selo>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <TituloSecao
            acao={
              <Link href="/admin/registros" className="inline-flex items-center gap-1 text-sm font-semibold text-marca-600 hover:text-marca-800">
                Ver todos <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          >
            Últimos registros
          </TituloSecao>
          {ultimos.length === 0 ? (
            <EstadoVazio titulo="Nenhum registro ainda" />
          ) : (
            <ul className="space-y-3">
              {ultimos.map((r) => (
                <ItemRegistro
                  key={r.id}
                  registro={r}
                  colaborador={r.profiles?.nome}
                  acoes={<span className="text-xs text-slate-400">criado {formatarDataHora(r.criado_em)}</span>}
                />
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}
