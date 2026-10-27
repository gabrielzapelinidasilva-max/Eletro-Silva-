import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, Filter, Wrench, X } from "lucide-react";
import { PainelGastos } from "./PainelGastos";
import { GastosFixos, type ResumoMes } from "./GastosFixos";
import { LinkLixeira } from "@/components/LinkLixeira";
import { ConfiguracoesGastos } from "./ConfiguracoesGastos";
import { Indicador } from "@/components/ui/Cartao";
import { Campo } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida, formatarData, hojeSP, inicioMes } from "@/lib/datas";
import { calcular, formatarMargem, formatarMoeda, normalizarLancamento, type Configuracoes, type LancamentoCusto, type Veiculo } from "@/lib/gastos";
import { nomeMes, normalizarFixo, ultimoDiaDoMes, type GastoFixo, type GastoFixoMes } from "@/lib/fixos";

export const metadata: Metadata = { title: "Controle de gastos" };

type Parametros = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PaginaGastos({ searchParams }: { searchParams: Promise<Parametros> }) {
  await exigirAdmin();
  const p = await searchParams;
  const hoje = hojeSP();
  const de = dataValida(um(p.de)) ? um(p.de) : inicioMes(hoje);
  const ate = dataValida(um(p.ate)) ? um(p.ate) : hoje;
  const supabase = await criarClienteServidor();
  const aba = um(p.aba) === "fixos" ? "fixos" : "servicos";

  // Fecha os meses que já terminaram: lança os gastos fixos e desconta do lucro do mês.
  await supabase.rpc("fechar_meses_pendentes");

  if (aba === "fixos") return <AbaFixos hoje={hoje} />;

  const [{ data: cfg }, { data: carros }, { data: lancs }, { data: fixosPeriodo }, { data: cadastrados }] = await Promise.all([
    supabase.from("configuracoes").select("preco_gasolina, valor_hora_padrao").eq("id", 1).maybeSingle(),
    supabase.from("veiculos").select("id, nome, consumo_km_l, ativo").order("nome"),
    supabase.from("custos_servico").select("*, registros(valor_servico, profiles(nome))").gte("data", de).lte("data", ate).order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(1000),
    supabase.from("gastos_fixos_mes").select("mes, valor").gte("mes", inicioMes(de)).lte("mes", ate),
    supabase.from("gastos_fixos").select("valor").eq("ativo", true),
  ]);

  const config: Configuracoes = {
    preco_gasolina: Number(cfg?.preco_gasolina ?? 6.39),
    valor_hora_padrao: Number(cfg?.valor_hora_padrao ?? 0),
  };
  const veiculos: Veiculo[] = (carros ?? []).map((v) => ({ ...v, consumo_km_l: Number(v.consumo_km_l) }));
  const lancamentos = (lancs ?? []).map(normalizarLancamento);
  // Totais do período
  const tot = lancamentos.reduce(
    (a, l) => {
      const c = calcular(l);
      a.servicos += l.valor_servico;
      a.faturamento += c.receita;
      a.material += l.valor_material;
      a.gasolina += c.custoGasolina;
      a.maoDeObra += c.maoDeObra;
      a.custos += c.custoTotal;
      a.lucro += c.lucro;
      return a;
    },
    { servicos: 0, faturamento: 0, material: 0, gasolina: 0, maoDeObra: 0, custos: 0, lucro: 0 },
  );
  // Gastos fixos dos meses (já fechados) que estão no período
  const totalFixos = (fixosPeriodo ?? []).reduce((s, f) => s + Number(f.valor), 0);
  const lucroFinal = tot.lucro - totalFixos;
  const margem = tot.faturamento > 0 ? (lucroFinal / tot.faturamento) * 100 : null;
  // O mês atual ainda não fechou: mostra o que será descontado no último dia
  const mesAtual = inicioMes(hoje);
  const previstoMesAtual = ate >= mesAtual ? (cadastrados ?? []).reduce((s, f) => s + Number(f.valor), 0) : 0;
  const filtrado = Boolean(um(p.de) || um(p.ate));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Controle de gastos</h1>
          <p className="text-slate-500">Ganhos (serviço + material + mão de obra), gastos (gasolina) e lucro de cada serviço. Período de {formatarData(de)} a {formatarData(ate)}.</p>
        </div>
        <LinkLixeira />
      </div>

      <AbasGastos aba="servicos" />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="min-w-36 flex-1"><Campo rotulo="Data inicial" name="de" type="date" defaultValue={de} /></div>
        <div className="min-w-36 flex-1"><Campo rotulo="Data final" name="ate" type="date" defaultValue={ate} /></div>
        <div className="flex gap-2">
          <button type="submit" className={classesBotao("primario", "md")}><Filter className="size-4" aria-hidden /> Filtrar</button>
          {filtrado && (
            <Link href="/admin/gastos" className={classesBotao("fantasma", "md")}><X className="size-4" aria-hidden /> Mês atual <IndicadorLink /></Link>
          )}
        </div>
      </form>

      <section aria-label="Totais do período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Faturamento" valor={formatarMoeda(tot.faturamento)} detalhe={`serviço + material + mão de obra · ${lancamentos.length} ${lancamentos.length === 1 ? "serviço" : "serviços"}`} />
        <Indicador rotulo="Custos" valor={formatarMoeda(tot.custos + totalFixos)} detalhe="gasolina + gastos fixos dos meses fechados" />
        <Indicador rotulo={lucroFinal < 0 ? "Prejuízo final" : "Lucro final"} valor={formatarMoeda(lucroFinal)} detalhe={`lucro dos serviços ${formatarMoeda(tot.lucro)} − gastos fixos ${formatarMoeda(totalFixos)}`} destaque />
        <Indicador rotulo="Lucro (%)" valor={formatarMargem(margem)} detalhe="lucro final sobre o faturamento" />
      </section>

      {previstoMesAtual > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Os gastos fixos de {nomeMes(mesAtual)} ({formatarMoeda(previstoMesAtual)}) serão descontados automaticamente em {formatarData(ultimoDiaDoMes(hoje))}.{" "}
          <Link href="/admin/gastos?aba=fixos" className="font-semibold underline">Ver gastos fixos</Link>
        </p>
      )}

      {(lancamentos.length > 0 || totalFixos > 0) && (
        <section aria-label="Detalhe dos ganhos e gastos" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MiniTotal rotulo="Serviços cobrados" valor={tot.servicos} ganho />
          <MiniTotal rotulo="Material (ganho)" valor={tot.material} ganho />
          <MiniTotal rotulo="Mão de obra (ganho)" valor={tot.maoDeObra} ganho />
          <MiniTotal rotulo="Gasolina" valor={tot.gasolina} />
          <MiniTotal rotulo="Gastos fixos" valor={totalFixos} />
        </section>
      )}

      <PainelGastos lancamentos={lancamentos} veiculos={veiculos} config={config} hoje={hoje} />

      <ConfiguracoesGastos config={config} veiculos={veiculos} />
    </div>
  );
}

function AbasGastos({ aba }: { aba: "servicos" | "fixos" }) {
  const item = (alvo: "servicos" | "fixos", href: string, icone: React.ReactNode, rotulo: string) => (
    <Link href={href} aria-current={aba === alvo ? "page" : undefined}
      className={classesBotao(aba === alvo ? "primario" : "secundario", "md", "flex-1 sm:flex-none")}>
      {icone} {rotulo} <IndicadorLink />
    </Link>
  );
  return (
    <nav aria-label="Partes da aba Gastos" className="flex gap-2">
      {item("servicos", "/admin/gastos", <Wrench className="size-4" aria-hidden />, "Serviços")}
      {item("fixos", "/admin/gastos?aba=fixos", <CalendarRange className="size-4" aria-hidden />, "Gastos fixos por mês")}
    </nav>
  );
}

/** Parte "Gastos fixos por mês": cadastro dos fixos e lucro final de cada mês. */
async function AbaFixos({ hoje }: { hoje: string }) {
  const supabase = await criarClienteServidor();
  const mesAtual = inicioMes(hoje);
  const desde = `${String(Number(hoje.slice(0, 4)) - 2)}${hoje.slice(4, 7)}-01`; // últimos 24 meses
  const [{ data: fixos }, { data: itens }, { data: fechados }, { data: lancs }] = await Promise.all([
    supabase.from("gastos_fixos").select("id, descricao, categoria, valor, ativo").order("ativo", { ascending: false }).order("descricao"),
    supabase.from("gastos_fixos_mes").select("id, mes, descricao, categoria, valor").gte("mes", desde).order("valor", { ascending: false }),
    supabase.from("meses_fechados").select("mes").gte("mes", desde),
    supabase.from("custos_servico").select("data, valor_material, km_rodados, consumo_km_l, preco_gasolina, horas, valor_hora, valor_servico").gte("data", desde).limit(20000),
  ]);

  const mesesFechados = new Set((fechados ?? []).map((f) => f.mes as string));
  const porMes = new Map<string, ResumoMes>();
  const garantir = (mes: string) => {
    if (!porMes.has(mes)) porMes.set(mes, { mes, fechado: mesesFechados.has(mes), lucroServicos: 0, servicos: 0, itens: [] });
    return porMes.get(mes)!;
  };
  garantir(mesAtual);
  mesesFechados.forEach((m) => garantir(m));
  for (const l of (lancs ?? []).map((x) => normalizarLancamento(x as Record<string, unknown>)) as LancamentoCusto[]) {
    const m = garantir(`${l.data.slice(0, 7)}-01`);
    m.lucroServicos += calcular(l).lucro;
    m.servicos += 1;
  }
  for (const i of (itens ?? []).map(normalizarFixo) as GastoFixoMes[]) garantir(i.mes).itens.push(i);
  const meses = [...porMes.values()].sort((a, b) => b.mes.localeCompare(a.mes));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Controle de gastos</h1>
          <p className="text-slate-500">Gastos fixos (salários, ferramentas, manutenção do carro) descontados do lucro no fim de cada mês.</p>
        </div>
        <LinkLixeira />
      </div>
      <AbasGastos aba="fixos" />
      <GastosFixos fixos={((fixos ?? []).map(normalizarFixo)) as GastoFixo[]} meses={meses} />
    </div>
  );
}

function MiniTotal({ rotulo, valor, ganho }: { rotulo: string; valor: number; ganho?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${ganho ? "bg-emerald-50/60 ring-emerald-100" : "bg-white ring-slate-200"}`}>
      <p className={`text-xs font-semibold ${ganho ? "text-emerald-800" : "text-slate-500"}`}>{ganho ? "+ " : "− "}{rotulo}</p>
      <p className="font-bold tabular-nums text-slate-800">{formatarMoeda(valor)}</p>
    </div>
  );
}
