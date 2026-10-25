import type { Metadata } from "next";
import Link from "next/link";
import { Filter, X } from "lucide-react";
import { PainelGastos } from "./PainelGastos";
import { ConfiguracoesGastos } from "./ConfiguracoesGastos";
import { Indicador } from "@/components/ui/Cartao";
import { Campo } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataValida, formatarData, hojeSP, inicioMes } from "@/lib/datas";
import { calcular, formatarMargem, formatarMoeda, normalizarLancamento, type Configuracoes, type Veiculo } from "@/lib/gastos";

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

  const [{ data: cfg }, { data: carros }, { data: lancs }] = await Promise.all([
    supabase.from("configuracoes").select("preco_gasolina, valor_hora_padrao").eq("id", 1).maybeSingle(),
    supabase.from("veiculos").select("id, nome, consumo_km_l, ativo").order("nome"),
    supabase.from("custos_servico").select("*, registros(valor_servico, profiles(nome))").gte("data", de).lte("data", ate).order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(1000),
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
      a.maoDeObra += c.custoMaoDeObra;
      a.custos += c.custoTotal;
      a.lucro += c.lucro;
      return a;
    },
    { servicos: 0, faturamento: 0, material: 0, gasolina: 0, maoDeObra: 0, custos: 0, lucro: 0 },
  );
  const margem = tot.faturamento > 0 ? (tot.lucro / tot.faturamento) * 100 : null;
  const filtrado = Boolean(um(p.de) || um(p.ate));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Controle de gastos</h1>
        <p className="text-slate-500">Ganhos (serviço + material), gastos (gasolina + mão de obra) e lucro de cada serviço. Período de {formatarData(de)} a {formatarData(ate)}.</p>
      </div>

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
        <Indicador rotulo="Faturamento" valor={formatarMoeda(tot.faturamento)} detalhe={`serviços + material · ${lancamentos.length} ${lancamentos.length === 1 ? "serviço" : "serviços"}`} />
        <Indicador rotulo="Custos" valor={formatarMoeda(tot.custos)} detalhe="gasolina + mão de obra" />
        <Indicador rotulo={tot.lucro < 0 ? "Prejuízo" : "Lucro"} valor={formatarMoeda(tot.lucro)} detalhe={tot.lucro < 0 ? "os gastos passaram dos ganhos" : "faturamento − custos"} destaque />
        <Indicador rotulo="Lucro (%)" valor={formatarMargem(margem)} detalhe="sobre o faturamento" />
      </section>

      {lancamentos.length > 0 && (
        <section aria-label="Detalhe dos ganhos e gastos" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniTotal rotulo="Serviços cobrados" valor={tot.servicos} ganho />
          <MiniTotal rotulo="Material (ganho)" valor={tot.material} ganho />
          <MiniTotal rotulo="Gasolina" valor={tot.gasolina} />
          <MiniTotal rotulo="Mão de obra" valor={tot.maoDeObra} />
        </section>
      )}

      <PainelGastos lancamentos={lancamentos} veiculos={veiculos} config={config} hoje={hoje} />

      <ConfiguracoesGastos config={config} veiculos={veiculos} />
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
