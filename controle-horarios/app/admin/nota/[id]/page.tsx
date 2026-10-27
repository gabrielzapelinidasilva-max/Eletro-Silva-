/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BotaoImprimir } from "./BotaoImprimir";
import { classesBotao } from "@/components/ui/estilos";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarData, formatarHora } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import { formatarMoeda, formatarNumero } from "@/lib/gastos";
import { urlArquivo } from "@/lib/fotos";
import { EMPRESA } from "@/lib/empresa";
import type { Registro } from "@/lib/tipos";

export const metadata: Metadata = { title: "Nota de serviço" };

/** Nota (ordem) de serviço pronta para imprimir ou salvar em PDF. */
export default async function NotaServico({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("registros").select("*, profiles(nome, telefone), veiculos(nome)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as Registro & { profiles: { nome: string; telefone: string | null } | null; veiculos: { nome: string } | null };
  const material = Number(r.valor_material ?? 0);
  const servico = r.valor_servico == null ? null : Number(r.valor_servico);
  const numero = r.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/gastos" className={classesBotao("fantasma", "md")}><ArrowLeft className="size-4" aria-hidden /> Voltar</Link>
        <BotaoImprimir />
      </div>

      <article className="rounded-2xl bg-white p-6 text-[13px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-slate-200 sm:p-10 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-marca-600 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo-azul.jpg" alt="" className="size-16 rounded-lg" width={64} height={64} />
            <div>
              <p className="text-lg font-extrabold text-marca-700">{EMPRESA.nome}</p>
              <p className="text-xs text-slate-600">{EMPRESA.endereco}</p>
              <p className="text-xs text-slate-600">Tel. {EMPRESA.telefone} · WhatsApp {EMPRESA.whatsapp} · {EMPRESA.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nota de serviço</p>
            <p className="text-xl font-extrabold tabular-nums">Nº {numero}</p>
            <p className="text-xs text-slate-600">{formatarData(r.data)}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <Linha rotulo="Cliente" valor={r.cliente} />
          <Linha rotulo="Eletricista" valor={r.profiles?.nome ?? "—"} />
          <Linha rotulo="Data" valor={formatarData(r.data)} />
          <Linha rotulo="Horário" valor={`${formatarHora(r.hora_chegada)} às ${formatarHora(r.hora_saida)}${r.minutos_trabalhados != null ? ` (${formatarMinutos(r.minutos_trabalhados)})` : ""}`} />
          {r.veiculos?.nome && <Linha rotulo="Veículo" valor={`${r.veiculos.nome}${Number(r.km_rodados) ? ` · ${formatarNumero(Number(r.km_rodados), 1)} km` : ""}`} />}
        </section>

        <section className="mt-5">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-marca-700">Serviço realizado</h2>
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 print:bg-transparent print:p-0">{r.servico || "—"}</p>
          {r.observacoes && (
            <>
              <h2 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-marca-700">Observações</h2>
              <p className="whitespace-pre-wrap">{r.observacoes}</p>
            </>
          )}
        </section>

        <section className="mt-5">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-marca-700">Valores</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-slate-200"><td className="py-1.5">Serviço</td><td className="py-1.5 text-right tabular-nums">{servico == null ? "—" : formatarMoeda(servico)}</td></tr>
              <tr className="border-b border-slate-200"><td className="py-1.5">Material</td><td className="py-1.5 text-right tabular-nums">{formatarMoeda(material)}</td></tr>
              <tr className="font-bold"><td className="py-1.5">Total</td><td className="py-1.5 text-right text-base tabular-nums">{formatarMoeda((servico ?? 0) + material)}</td></tr>
            </tbody>
          </table>
        </section>

        {(r.fotos_antes?.length > 0 || r.fotos_depois?.length > 0) && (
          <section className="mt-6 break-inside-avoid">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-marca-700">Fotos</h2>
            <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <GrupoFotos titulo="Antes" fotos={r.fotos_antes} />
              <GrupoFotos titulo="Depois" fotos={r.fotos_depois} />
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-8 sm:grid-cols-2 print:grid-cols-2 break-inside-avoid">
          <div className="text-center">
            {r.assinatura ? (
              <img src={urlArquivo(r.assinatura)} alt="Assinatura do cliente" className="mx-auto h-24 object-contain" />
            ) : (
              <div className="h-24" />
            )}
            <div className="border-t border-slate-400 pt-1 text-xs text-slate-600">
              Assinatura do cliente{r.assinatura_nome ? ` – ${r.assinatura_nome}` : ""}
            </div>
          </div>
          <div className="text-center">
            <div className="h-24" />
            <div className="border-t border-slate-400 pt-1 text-xs text-slate-600">{r.profiles?.nome ?? "Eletricista"} – {EMPRESA.nome}</div>
          </div>
        </section>
      </article>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p><span className="font-semibold text-slate-500">{rotulo}: </span>{valor}</p>
  );
}

function GrupoFotos({ titulo, fotos }: { titulo: string; fotos: string[] }) {
  if (!fotos?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-600">{titulo}</p>
      <div className="grid grid-cols-2 gap-2">
        {fotos.map((f) => <img key={f} src={urlArquivo(f)} alt={`Foto do ${titulo.toLowerCase()}`} className="aspect-square w-full rounded-lg object-cover" />)}
      </div>
    </div>
  );
}
