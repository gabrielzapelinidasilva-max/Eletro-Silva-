"use client";

import {
  ArrowDownCircleIcon, ArrowUpCircleIcon, ChartColumnIcon, PiggyBankIcon, RepeatIcon, ScaleIcon,
} from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { ErrorState } from "@/components/app/states";
import type { MonthlySummary } from "@/lib/db-types";
import { addMonths, formatBRL, formatMonth, formatMonthShort } from "@/lib/format";
import { useMonth } from "@/lib/month-context";
import { unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

type MonthRow = {
  month: string; // YYYY-MM
  incomes: number;
  variable: number;
  fixed: number;
  invested: number;
  expenses: number;
  balance: number;
};

function toRows(data: MonthlySummary[], last: string): MonthRow[] {
  const byMonth = new Map(data.map((d) => [String(d.month).slice(0, 7), d]));
  return Array.from({ length: 12 }, (_, i) => {
    const ym = addMonths(last, i - 11);
    const d = byMonth.get(ym);
    const incomes = Number(d?.total_incomes ?? 0);
    const variable = Number(d?.total_variable_expenses ?? 0);
    const fixed = Number(d?.total_fixed_expenses ?? 0);
    const invested = Number(d?.total_invested ?? 0);
    return {
      month: ym,
      incomes,
      variable,
      fixed,
      invested,
      expenses: Math.round((variable + fixed) * 100) / 100,
      balance: Number(d?.balance ?? 0),
    };
  });
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function SummaryTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const first = addMonths(month, -11);

  const { data, error, reload } = useQuery(`summary:${month}`, async () =>
    unwrap(
      await supabase
        .from("monthly_summary")
        .select("*")
        .gte("month", `${first}-01`)
        .lte("month", `${month}-01`)
        .order("month"),
    ),
  );

  const rows = data ? toRows(data, month) : null;
  const cur = rows?.[11];
  const loading = !rows;
  const positive = (cur?.balance ?? 0) >= 0;

  return (
    <>
      <PageTitle
        title="Resumo do Mês"
        description={`Comparação de ${formatMonth(month)}`}
        icon={ChartColumnIcon}
        tone="bg-primary/15 text-primary-dark dark:text-primary"
      />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Ganhos" value={cur?.incomes} icon={ArrowUpCircleIcon} tone="income" loading={loading} />
            <StatCard label="Gastos variáveis" value={cur?.variable} icon={ArrowDownCircleIcon} tone="expense" loading={loading} />
            <StatCard label="Gastos fixos" value={cur?.fixed} icon={RepeatIcon} tone="fixed" loading={loading} />
            <StatCard label="Investido no mês" value={cur?.invested} icon={PiggyBankIcon} tone="invest" loading={loading} hint="Aportes − resgates" />
          </div>

          <Card
            className={cn(
              "mt-4 gap-2 border-2",
              loading ? "" : positive ? "border-income/40 bg-income/5" : "border-expense/40 bg-expense/5",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-11 items-center justify-center rounded-2xl", positive ? "bg-income/15 text-income" : "bg-expense/15 text-expense")}>
                  <ScaleIcon className="size-6" />
                </span>
                <div>
                  <p className="font-semibold">Saldo final do mês</p>
                  <p className="text-xs text-muted-foreground">Ganhos − gastos variáveis − gastos fixos − investimentos</p>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-10 w-44" />
              ) : (
                <p data-testid="saldo-final" className={cn("text-3xl font-extrabold tracking-tight tabular-nums", positive ? "text-income" : "text-expense")}>
                  {formatBRL(cur?.balance)}
                </p>
              )}
            </div>
            {cur && !loading && (
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatBRL(cur.incomes)} − {formatBRL(cur.variable)} − {formatBRL(cur.fixed)} − {formatBRL(cur.invested)} ={" "}
                <strong className={positive ? "text-income" : "text-expense"}>{formatBRL(cur.balance)}</strong>
              </p>
            )}
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Últimos 12 meses</CardTitle>
              <CardDescription>Ganhos × gastos (variáveis + fixos), com a linha do saldo.</CardDescription>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-72" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows!.map((r) => ({ ...r, label: formatMonthShort(r.month) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => compact.format(Number(v))} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(v) => formatBRL(Number(v))}
                      labelFormatter={(_, p) => (p?.[0] ? formatMonth(String((p[0].payload as MonthRow).month)) : "")}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }}
                      cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="incomes" name="Ganhos" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expenses" name="Gastos" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Line dataKey="balance" name="Saldo" type="monotone" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Histórico mês a mês</CardTitle>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Investido</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows!].reverse().map((r) => (
                    <TableRow key={r.month} className={cn(r.month === month && "bg-primary/8")}>
                      <TableCell className="font-medium capitalize">{formatMonth(r.month)}</TableCell>
                      <TableCell className="text-right text-income tabular-nums">{formatBRL(r.incomes)}</TableCell>
                      <TableCell className="text-right text-expense tabular-nums">{formatBRL(r.expenses)}</TableCell>
                      <TableCell className="text-right text-invest tabular-nums">{formatBRL(r.invested)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", r.balance >= 0 ? "text-income" : "text-expense")}>
                        {formatBRL(r.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
