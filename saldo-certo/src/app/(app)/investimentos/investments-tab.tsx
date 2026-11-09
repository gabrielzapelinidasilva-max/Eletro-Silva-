"use client";

import { useState } from "react";
import {
  ArrowDownToLineIcon, ArrowUpFromLineIcon, CalculatorIcon, ChartLineIcon, LandmarkIcon, PiggyBankIcon, PlusIcon, SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvestmentDialog, type InvestmentInput } from "@/components/app/investment-dialog";
import { EntryList } from "@/components/app/entry-list";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CategoryPie, type Slice } from "@/components/app/category-pie";
import { YieldSimulator, type SimulatorDefaults } from "@/components/app/yield-simulator";
import { INVESTMENT_TYPES, OPERATION_LABEL } from "@/lib/constants";
import type { Investment } from "@/lib/db-types";
import { formatBRL, formatDate, formatMonth, monthRange, todaySP } from "@/lib/format";
import { fetchQuotes } from "@/lib/market-client";
import type { Quote } from "@/lib/market-shared";
import { useMonth } from "@/lib/month-context";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";
import {
  addMonthsToDate, formatPct, formatRate, formatTerm, futureValue, monthsBetween, RATE_PERIOD_SHORT, type RatePeriod,
} from "@/lib/yield";

const signed = (r: Pick<Investment, "amount" | "operation">) =>
  r.operation === "resgate" ? -Number(r.amount) : Number(r.amount);

const quoteKey = (r: Pick<Investment, "ticker" | "type">) => `${r.ticker}:${r.type}`;

/** Aporte com taxa informada (renda fixa, poupança...). */
function fixedProjection(r: Investment) {
  if (r.operation !== "aporte" || r.rate == null || !r.rate_period || !r.term_months) return null;
  const period = r.rate_period as RatePeriod;
  const rate = Number(r.rate);
  const months = r.term_months;
  const elapsed = Math.min(monthsBetween(r.date, todaySP()), months);
  return {
    kind: "fixed" as const,
    rate,
    period,
    months,
    endDate: addMonthsToDate(r.date, months),
    finalValue: futureValue(Number(r.amount), rate, period, months),
    todayValue: futureValue(Number(r.amount), rate, period, elapsed),
  };
}

/** Aporte acompanhado pela cotação de mercado (ações, FIIs, cripto). */
function marketProjection(r: Investment, quote: Quote | null | undefined) {
  if (r.operation !== "aporte" || !r.ticker || !r.purchase_price || !quote) return null;
  const todayValue = (Number(r.amount) * quote.price) / Number(r.purchase_price);
  const months = r.term_months;
  const finalValue =
    months && quote.monthlyAvg !== null ? todayValue * Math.pow(1 + quote.monthlyAvg, months) : null;
  return { kind: "market" as const, quote, todayValue, months, finalValue };
}

export function InvestmentsTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const [dialog, setDialog] = useState<{ key: number; editing?: Investment } | null>(null);
  const [projecting, setProjecting] = useState<{ title: string; subtitle: string; defaults: SimulatorDefaults; market: boolean } | null>(null);

  // Busca tudo até o fim do mês: o mês atual vem filtrado e o acumulado é a soma de tudo.
  const { data, error, loading, reload } = useQuery(`investments:${month}`, async () =>
    unwrap(
      await supabase
        .from("investments")
        .select("*")
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
  );
  const all = data ?? [];
  const rows = all.filter((r) => r.date >= start);

  // Cotações atuais dos ativos de mercado (uma chamada para todos).
  const keys = [...new Set(all.filter((r) => r.ticker && r.operation === "aporte").map(quoteKey))].sort();
  const quotesQuery = useQuery(`quotes:${keys.join(",")}`, () => fetchQuotes(keys));
  const quotes = quotesQuery.data ?? {};

  const aportes = rows.filter((r) => r.operation === "aporte").reduce((s, r) => s + Number(r.amount), 0);
  const resgates = rows.filter((r) => r.operation === "resgate").reduce((s, r) => s + Number(r.amount), 0);
  const accumulated = all.reduce((s, r) => s + signed(r), 0);

  // Rendimento até hoje: juros estimados (renda fixa) + variação das cotações (mercado).
  let gainToday = 0;
  let tracked = 0;
  for (const r of all) {
    const p = fixedProjection(r) ?? marketProjection(r, quotes[quoteKey(r)]);
    if (p) {
      gainToday += p.todayValue - Number(r.amount);
      tracked += 1;
    }
  }

  const byType: Slice[] = INVESTMENT_TYPES.map((t) => ({
    name: t,
    value: Math.round(all.filter((r) => r.type === t).reduce((s, r) => s + signed(r), 0) * 100) / 100,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const save = async (v: InvestmentInput) => {
    const ok = dialog?.editing
      ? await run(supabase.from("investments").update(v).eq("id", dialog.editing.id), "Investimento atualizado!")
      : await run(supabase.from("investments").insert(v), "Investimento registrado!");
    if (ok) reload();
    return ok;
  };

  const remove = async (id: string) => {
    const ok = await run(supabase.from("investments").delete().eq("id", id), "Investimento excluído.");
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <PageTitle
        title="Investimentos"
        description={`Aportes e resgates de ${formatMonth(month)}`}
        icon={PiggyBankIcon}
        tone="bg-invest/12 text-invest"
        action={
          <Button onClick={() => setDialog({ key: Date.now() })}>
            <PlusIcon /> Novo investimento
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total aportado no mês" value={aportes} icon={ArrowDownToLineIcon} tone="invest" loading={loading && !data} hint={resgates ? `Resgates no mês: ${formatBRL(resgates)}` : undefined} />
        <StatCard label="Investido no mês (líquido)" value={aportes - resgates} icon={ArrowUpFromLineIcon} tone="invest" loading={loading && !data} hint="Aportes − resgates" />
        <StatCard label="Saldo investido acumulado" value={accumulated} icon={LandmarkIcon} tone="primary" loading={loading && !data} hint="Quanto você colocou (aportes − resgates)" />
        <StatCard
          label="Rendimento até hoje"
          value={gainToday}
          icon={SparklesIcon}
          tone={gainToday >= 0 ? "income" : "expense"}
          loading={(loading && !data) || (keys.length > 0 && quotesQuery.loading && !quotesQuery.data)}
          hint={tracked ? `Juros estimados + variação das cotações (${tracked} ${tracked === 1 ? "aporte" : "aportes"})` : "Informe a taxa ou o código do ativo nos aportes"}
        />
      </div>

      {quotesQuery.error && keys.length > 0 && (
        <p role="alert" className="mb-4 rounded-2xl bg-expense/10 px-4 py-3 text-sm text-expense">
          Não consegui atualizar as cotações agora ({quotesQuery.error}). Os valores de mercado aparecem quando a conexão voltar.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Movimentações do mês</CardTitle>
            <CardDescription>Toque em <ChartLineIcon className="inline size-3.5" /> para ver a projeção de um aporte.</CardDescription>
          </CardHeader>
          {error && !data ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data ? (
            <ListSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState title="Nenhuma movimentação neste mês" hint='Clique em "Novo investimento" para registrar.' />
          ) : (
            <EntryList
              tone="invest"
              items={rows.map((r) => {
                const fp = fixedProjection(r);
                const mp = fp ? null : marketProjection(r, quotes[quoteKey(r)]);
                const amount = Number(r.amount);
                let details: React.ReactNode = null;
                let onProject: (() => void) | null = null;

                if (fp) {
                  details = (
                    <div className="mt-1 grid gap-0.5 text-xs">
                      <p className="font-medium text-invest">
                        {formatRate(fp.rate)} {RATE_PERIOD_SHORT[fp.period]} · {formatTerm(fp.months)} → {formatBRL(fp.finalValue)} em {formatDate(fp.endDate)}
                      </p>
                      <p className="text-muted-foreground">
                        Hoje ≈ {formatBRL(fp.todayValue)} <span className="text-income">(+ {formatBRL(fp.todayValue - amount)})</span>
                      </p>
                    </div>
                  );
                  onProject = () =>
                    setProjecting({
                      title: r.description,
                      subtitle: `${r.type} · aplicado em ${formatDate(r.date)} · ${formatRate(fp.rate)} ${RATE_PERIOD_SHORT[fp.period]}`,
                      defaults: { initial: amount, ratePercent: fp.rate, period: fp.period, months: fp.months },
                      market: false,
                    });
                } else if (r.ticker && r.operation === "aporte") {
                  if (mp) {
                    const pct = mp.todayValue / amount - 1;
                    details = (
                      <div className="mt-1 grid gap-0.5 text-xs">
                        <p className="font-medium text-invest">
                          {r.ticker} · cotação {formatBRL(mp.quote.price)} (na compra {formatBRL(Number(r.purchase_price))})
                        </p>
                        <p className="text-muted-foreground">
                          Hoje ≈ {formatBRL(mp.todayValue)}{" "}
                          <span className={pct >= 0 ? "text-income" : "text-expense"}>({formatPct(pct)})</span>
                          {mp.finalValue !== null && mp.months ? <> · em {formatTerm(mp.months)} ≈ {formatBRL(mp.finalValue)}</> : null}
                        </p>
                      </div>
                    );
                    if (mp.quote.monthlyAvg !== null) {
                      onProject = () =>
                        setProjecting({
                          title: `${r.description} (${r.ticker})`,
                          subtitle: `${mp.quote.name} · últimos 12 meses ${formatPct(mp.quote.change12m ?? 0)} (≈ ${formatPct(mp.quote.monthlyAvg ?? 0)} ao mês)`,
                          defaults: { initial: Math.round(mp.todayValue * 100) / 100, ratePercent: (mp.quote.monthlyAvg ?? 0) * 100, period: "mensal", months: mp.months ?? 12 },
                          market: true,
                        });
                    }
                  } else {
                    details = (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.ticker} · {quotesQuery.loading ? "buscando cotação..." : "cotação indisponível agora"}
                      </p>
                    );
                  }
                }

                return {
                  ...r,
                  category: r.type,
                  sign: r.operation === "resgate" ? ("-" as const) : ("+" as const),
                  badge: <Badge variant={r.operation === "aporte" ? "secondary" : "outline"}>{OPERATION_LABEL[r.operation as "aporte"]}</Badge>,
                  details,
                  actions: onProject && (
                    <Button variant="ghost" size="icon" className="size-8 text-invest" aria-label={`Ver projeção de ${r.description}`} title="Ver projeção" onClick={onProject}>
                      <ChartLineIcon />
                    </Button>
                  ),
                };
              })}
              onEdit={(id) => setDialog({ key: Date.now(), editing: rows.find((r) => r.id === id) })}
              onDelete={remove}
            />
          )}
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Carteira por tipo</CardTitle>
            <CardDescription>Quanto você colocou em cada tipo (aportes − resgates).</CardDescription>
          </CardHeader>
          {!data ? (
            <ListSkeleton rows={3} />
          ) : byType.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem saldo investido ainda.</p>
          ) : (
            <CategoryPie data={byType} order={INVESTMENT_TYPES} />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalculatorIcon className="size-4 text-invest" /> Simulador de rendimento
          </CardTitle>
          <CardDescription>Teste quanto um valor rende com a taxa e o prazo que você quiser. Nada aqui é salvo.</CardDescription>
        </CardHeader>
        <YieldSimulator />
      </Card>

      {dialog && (
        <InvestmentDialog key={dialog.key} open onOpenChange={(o) => !o && setDialog(null)} initial={dialog.editing} onSubmit={save} />
      )}

      <Dialog open={!!projecting} onOpenChange={(o) => !o && setProjecting(null)}>
        {projecting && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Projeção: {projecting.title}</DialogTitle>
              <DialogDescription>
                {projecting.subtitle}.{" "}
                {projecting.market
                  ? "Parte do valor de hoje e repete o ritmo dos últimos 12 meses. Rentabilidade passada não garante rentabilidade futura."
                  : "Mude os valores para simular outros cenários; nada é salvo."}
              </DialogDescription>
            </DialogHeader>
            <YieldSimulator key={projecting.title} defaults={projecting.defaults} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
