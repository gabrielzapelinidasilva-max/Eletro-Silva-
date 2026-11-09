"use client";

import { useState } from "react";
import {
  ArrowDownToLineIcon, ArrowUpFromLineIcon, CalculatorIcon, ChartLineIcon, LandmarkIcon, PiggyBankIcon, PlusIcon, SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntryDialog, type EntryDialogConfig, type EntryValues } from "@/components/app/entry-dialog";
import { EntryList } from "@/components/app/entry-list";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CategoryPie, type Slice } from "@/components/app/category-pie";
import { YieldSimulator } from "@/components/app/yield-simulator";
import { INVESTMENT_OPERATIONS, INVESTMENT_TYPES, OPERATION_LABEL } from "@/lib/constants";
import type { Investment } from "@/lib/db-types";
import { formatBRL, formatDate, formatMonth, monthRange, todaySP } from "@/lib/format";
import { useMonth } from "@/lib/month-context";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";
import {
  addMonthsToDate, formatRate, formatTerm, futureValue, monthsBetween, RATE_PERIOD_SHORT, type RatePeriod,
} from "@/lib/yield";

const config: EntryDialogConfig = {
  noun: "investimento",
  categoryLabel: "Tipo",
  categories: INVESTMENT_TYPES,
  operations: INVESTMENT_OPERATIONS.map((o) => ({ value: o, label: OPERATION_LABEL[o] })),
  withYield: true,
};

const signed = (r: Pick<Investment, "amount" | "operation">) =>
  r.operation === "resgate" ? -Number(r.amount) : Number(r.amount);

/** Projeção de um aporte com taxa: valor no fim do prazo e valor estimado hoje. */
function projectionOf(r: Investment) {
  if (r.operation !== "aporte" || r.rate == null || !r.rate_period || !r.term_months) return null;
  const period = r.rate_period as RatePeriod;
  const rate = Number(r.rate);
  const months = r.term_months;
  const elapsed = Math.min(monthsBetween(r.date, todaySP()), months);
  return {
    rate,
    period,
    months,
    endDate: addMonthsToDate(r.date, months),
    finalValue: futureValue(Number(r.amount), rate, period, months),
    todayValue: futureValue(Number(r.amount), rate, period, elapsed),
    elapsed,
  };
}

export function InvestmentsTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const [dialog, setDialog] = useState<{ key: number; editing?: Investment } | null>(null);
  const [projecting, setProjecting] = useState<Investment | null>(null);

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
  const aportes = rows.filter((r) => r.operation === "aporte").reduce((s, r) => s + Number(r.amount), 0);
  const resgates = rows.filter((r) => r.operation === "resgate").reduce((s, r) => s + Number(r.amount), 0);
  const accumulated = all.reduce((s, r) => s + signed(r), 0);

  // Juros estimados até hoje dos aportes que têm taxa cadastrada.
  const projections = all.map((r) => ({ r, p: projectionOf(r) })).filter((x) => x.p);
  const interestToday = projections.reduce((s, { r, p }) => s + (p!.todayValue - Number(r.amount)), 0);

  // Saldo acumulado por tipo (para o gráfico), só tipos com saldo positivo.
  const byType: Slice[] = INVESTMENT_TYPES.map((t) => ({
    name: t,
    value: Math.round(all.filter((r) => r.type === t).reduce((s, r) => s + signed(r), 0) * 100) / 100,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const save = async (v: EntryValues) => {
    const y = v.operation === "aporte" ? v.yield : null;
    const payload = {
      description: v.description,
      amount: v.amount,
      date: v.date,
      type: v.category,
      operation: v.operation!,
      rate: y ? y.ratePercent : null,
      rate_period: y ? y.period : null,
      term_months: y ? y.months : null,
    };
    const ok = dialog?.editing
      ? await run(supabase.from("investments").update(payload).eq("id", dialog.editing.id), "Investimento atualizado!")
      : await run(supabase.from("investments").insert(payload), "Investimento registrado!");
    if (ok) reload();
    return ok;
  };

  const remove = async (id: string) => {
    const ok = await run(supabase.from("investments").delete().eq("id", id), "Investimento excluído.");
    if (ok) reload();
    return ok;
  };

  const editing = dialog?.editing;
  const editingProjection = editing ? projectionOf(editing) : null;

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
        <StatCard label="Saldo investido acumulado" value={accumulated} icon={LandmarkIcon} tone="primary" loading={loading && !data} hint="Até o fim do mês selecionado" />
        <StatCard
          label="Rendimento estimado até hoje"
          value={interestToday}
          icon={SparklesIcon}
          tone="income"
          loading={loading && !data}
          hint={projections.length ? `Juros dos ${projections.length} ${projections.length === 1 ? "aporte" : "aportes"} com taxa` : "Cadastre a taxa nos aportes para ver"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Movimentações do mês</CardTitle>
            <CardDescription>Nos aportes com taxa, toque em <ChartLineIcon className="inline size-3.5" /> para ver a projeção.</CardDescription>
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
                const p = projectionOf(r);
                return {
                  ...r,
                  category: r.type,
                  sign: r.operation === "resgate" ? ("-" as const) : ("+" as const),
                  badge: <Badge variant={r.operation === "aporte" ? "secondary" : "outline"}>{OPERATION_LABEL[r.operation as "aporte"]}</Badge>,
                  details: p && (
                    <div className="mt-1 grid gap-0.5 text-xs">
                      <p className="font-medium text-invest">
                        {formatRate(p.rate)} {RATE_PERIOD_SHORT[p.period]} · {formatTerm(p.months)} → {formatBRL(p.finalValue)} em {formatDate(p.endDate)}
                      </p>
                      <p className="text-muted-foreground">
                        Hoje ≈ {formatBRL(p.todayValue)}{" "}
                        <span className="text-income">(+ {formatBRL(p.todayValue - Number(r.amount))})</span>
                      </p>
                    </div>
                  ),
                  actions: p && (
                    <Button variant="ghost" size="icon" className="size-8 text-invest" aria-label={`Ver projeção de ${r.description}`} title="Ver projeção" onClick={() => setProjecting(r)}>
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
            <CardDescription>Saldo acumulado (aportes − resgates) por tipo.</CardDescription>
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
        <EntryDialog
          key={dialog.key}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          config={config}
          initial={
            editing
              ? {
                  ...editing,
                  category: editing.type,
                  yield: editingProjection
                    ? { ratePercent: editingProjection.rate, period: editingProjection.period, months: editingProjection.months }
                    : null,
                }
              : undefined
          }
          onSubmit={save}
        />
      )}

      <Dialog open={!!projecting} onOpenChange={(o) => !o && setProjecting(null)}>
        {projecting && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Projeção: {projecting.description}</DialogTitle>
              <DialogDescription>
                {projecting.type} · aplicado em {formatDate(projecting.date)}. Mude os valores para simular outros cenários; nada é salvo.
              </DialogDescription>
            </DialogHeader>
            <YieldSimulator
              key={projecting.id}
              defaults={{
                initial: Number(projecting.amount),
                ratePercent: Number(projecting.rate),
                period: projecting.rate_period as RatePeriod,
                months: projecting.term_months ?? 12,
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
