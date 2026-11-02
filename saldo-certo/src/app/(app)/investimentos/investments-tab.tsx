"use client";

import { useState } from "react";
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, LandmarkIcon, PiggyBankIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryDialog, type EntryDialogConfig, type EntryValues } from "@/components/app/entry-dialog";
import { EntryList } from "@/components/app/entry-list";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CategoryPie, type Slice } from "@/components/app/category-pie";
import { INVESTMENT_OPERATIONS, INVESTMENT_TYPES, OPERATION_LABEL } from "@/lib/constants";
import type { Investment } from "@/lib/db-types";
import { formatBRL, formatMonth, monthRange } from "@/lib/format";
import { useMonth } from "@/lib/month-context";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";

const config: EntryDialogConfig = {
  noun: "investimento",
  categoryLabel: "Tipo",
  categories: INVESTMENT_TYPES,
  operations: INVESTMENT_OPERATIONS.map((o) => ({ value: o, label: OPERATION_LABEL[o] })),
};

const signed = (r: Pick<Investment, "amount" | "operation">) =>
  r.operation === "resgate" ? -Number(r.amount) : Number(r.amount);

export function InvestmentsTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const [dialog, setDialog] = useState<{ key: number; editing?: Investment } | null>(null);

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

  // Saldo acumulado por tipo (para o gráfico), só tipos com saldo positivo.
  const byType: Slice[] = INVESTMENT_TYPES.map((t) => ({
    name: t,
    value: Math.round(all.filter((r) => r.type === t).reduce((s, r) => s + signed(r), 0) * 100) / 100,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const save = async (v: EntryValues) => {
    const payload = { description: v.description, amount: v.amount, date: v.date, type: v.category, operation: v.operation! };
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
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total aportado no mês" value={aportes} icon={ArrowDownToLineIcon} tone="invest" loading={loading && !data} hint={resgates ? `Resgates no mês: ${formatBRL(resgates)}` : undefined} />
        <StatCard label="Investido no mês (líquido)" value={aportes - resgates} icon={ArrowUpFromLineIcon} tone="invest" loading={loading && !data} hint="Aportes − resgates" />
        <StatCard label="Saldo investido acumulado" value={accumulated} icon={LandmarkIcon} tone="primary" loading={loading && !data} hint="Até o fim do mês selecionado" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Movimentações do mês</CardTitle>
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
              items={rows.map((r) => ({
                ...r,
                category: r.type,
                sign: r.operation === "resgate" ? ("-" as const) : ("+" as const),
                badge: <Badge variant={r.operation === "aporte" ? "secondary" : "outline"}>{OPERATION_LABEL[r.operation as "aporte"]}</Badge>,
              }))}
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

      {dialog && (
        <EntryDialog
          key={dialog.key}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          config={config}
          initial={editing ? { ...editing, category: editing.type } : undefined}
          onSubmit={save}
        />
      )}
    </>
  );
}
