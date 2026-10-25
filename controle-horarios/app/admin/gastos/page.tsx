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
import { dataValida, formatarData, hojeSP, inicioMes, somarDias } from "@/lib/datas";
import { calcular, formatarMargem, formatarMoeda, normalizarLancamento, type Configuracoes, type TrabalhoParaCusto, type Veiculo } from "@/lib/gastos";

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

  const [{ data: cfg }, { data: carros }, { data: lancs }, { data: trabs }, { data: vinculos }] = await Promise.all([
    supabase.from("configuracoes").select("preco_gasolina, valor_hora_padrao").eq("id", 1).maybeSingle(),
    supabase.from("veiculos").select("id, nome, consumo_km_l, ativo").order("nome"),
    supabase.from("custos_servico").select("*").gte("data", de).lte("data", ate).order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(1000),
    // Trabalhos encerrados dos últimos 6 meses, para ligar a um lançamento.
    supabase.from("registros").select("id, data, cliente, servico, minutos_trabalhados, profiles(nome)")
      .not("hora_saida", "is", null).gte("data", somarDias(hoje, -183)).order("data", { ascending: false }).limit(500),
    supabase.from("custos_servico").select("registro_id").not("registro_id", "is", null),
  ]);

  const config: Configuracoes = {
    preco_gasolina: Number(cfg?.preco_gasolina ?? 6.39),
    valor_hora_padrao: Number(cfg?.valor_hora_padrao ?? 0),
  };
  const veiculos: Veiculo[] = (carros ?? []).map((v) => ({ ...v, consumo_km_l: Number(v.consumo_km_l) }));
  const lancamentos = (lancs ?? []).map(normalizarLancamento);
  const trabalhos: TrabalhoParaCusto[] = (trabs ?? []).map((t) => ({
    id: t.id,
    data: t.data,
    cliente: t.cliente,
    servico: t.servico,
    minutos: t.minutos_trabalhados,
    colaborador: (t.profiles as unknown as { nome: string } | null)?.nome ?? "—",
  }));
  const jaLancados = (vinculos ?? []).map((v) => v.registro_id as string);

  // Totais do período
  const tot = lancamentos.reduce(
    (a, l) => {
      const c = calcular(l);
      a.faturamento += l.valor_servico;
      a.material += l.valor_material;
      a.gasolina += c.custoGasolina;
      a.maoDeObra += c.custoMaoDeObra;
      a.custos += c.custoTotal;
      a.lucro += c.lucro;
      return a;
    },
    { faturamento: 0, material: 0, gasolina: 0, maoDeObra: 0, custos: 0, lucro: 0 },
  );
  const margem = tot.faturamento > 0 ? (tot.lucro / tot.faturamento) * 100 : null;
  const filtrado = Boolean(um(p.de) || um(p.ate));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Controle de gastos</h1>
        <p className="text-slate-500">Custos, valor cobrado e lucro de cada serviço. Período de {formatarData(de)} a {formatarData(ate)}.</p>
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
        <Indicador rotulo="Faturamento" valor={formatarMoeda(tot.faturamento)} detalhe={`${lancamentos.length} ${lancamentos.length === 1 ? "serviço" : "serviços"}`} />
        <Indicador rotulo="Custos" valor={formatarMoeda(tot.custos)} detalhe="material + gasolina + mão de obra" />
        <Indicador rotulo={tot.lucro < 0 ? "Prejuízo" : "Lucro"} valor={formatarMoeda(tot.lucro)} detalhe={tot.lucro < 0 ? "os custos passaram do valor cobrado" : "valor cobrado − custos"} destaque />
        <Indicador rotulo="Lucro (%)" valor={formatarMargem(margem)} detalhe="sobre o faturamento" />
      </section>

      {lancamentos.length > 0 && (
        <section aria-label="De onde vêm os custos" className="grid grid-cols-3 gap-3">
          <MiniTotal rotulo="Material" valor={tot.material} />
          <MiniTotal rotulo="Gasolina" valor={tot.gasolina} />
          <MiniTotal rotulo="Mão de obra" valor={tot.maoDeObra} />
        </section>
      )}

      <PainelGastos lancamentos={lancamentos} veiculos={veiculos} config={config} trabalhos={trabalhos} jaLancados={jaLancados} hoje={hoje} />

      <ConfiguracoesGastos config={config} veiculos={veiculos} />
    </div>
  );
}

function MiniTotal({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-slate-500">{rotulo}</p>
      <p className="font-bold tabular-nums text-slate-800">{formatarMoeda(valor)}</p>
    </div>
  );
}
