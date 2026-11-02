"use client";

import { useState } from "react";
import { ArrowDownCircleIcon, PlusIcon, ReceiptIcon, RepeatIcon, ShoppingCartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryDialog, type EntryDialogConfig, type EntryValues } from "@/components/app/entry-dialog";
import { EntryList } from "@/components/app/entry-list";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CategoryPie, groupSum } from "@/components/app/category-pie";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Expense } from "@/lib/db-types";
import { formatMonth, monthRange } from "@/lib/format";
import { useMonth } from "@/lib/month-context";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";

const config: EntryDialogConfig = { noun: "gasto", categoryLabel: "Categoria", categories: EXPENSE_CATEGORIES };

export function ExpensesTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const [dialog, setDialog] = useState<{ key: number; editing?: Expense } | null>(null);

  const { data, error, loading, reload } = useQuery(`expenses:${month}`, async () =>
    unwrap(
      await supabase
        .from("expenses")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
  );
  const rows = data ?? [];
  const variable = rows.filter((r) => !r.is_fixed).reduce((s, r) => s + Number(r.amount), 0);
  const fixed = rows.filter((r) => r.is_fixed).reduce((s, r) => s + Number(r.amount), 0);

  const save = async (v: EntryValues) => {
    const payload = { description: v.description, amount: v.amount, date: v.date, category: v.category };
    const ok = dialog?.editing
      ? await run(supabase.from("expenses").update(payload).eq("id", dialog.editing.id), "Gasto atualizado!")
      : await run(supabase.from("expenses").insert(payload), "Gasto cadastrado!");
    if (ok) reload();
    return ok;
  };

  const remove = async (id: string) => {
    const ok = await run(supabase.from("expenses").delete().eq("id", id), "Gasto excluído.");
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <PageTitle
        title="Gastos"
        description={`Saídas de ${formatMonth(month)}`}
        icon={ArrowDownCircleIcon}
        tone="bg-expense/12 text-expense"
        action={
          <Button onClick={() => setDialog({ key: Date.now() })}>
            <PlusIcon /> Novo gasto
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total do mês" value={variable + fixed} icon={ReceiptIcon} tone="expense" loading={loading && !data} />
        <StatCard label="Gastos variáveis" value={variable} icon={ShoppingCartIcon} tone="expense" loading={loading && !data} />
        <StatCard label="Gastos fixos lançados" value={fixed} icon={RepeatIcon} tone="fixed" loading={loading && !data} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Lançamentos</CardTitle>
            <CardDescription>Itens com a etiqueta “Fixo” são lançados automaticamente pelos gastos fixos.</CardDescription>
          </CardHeader>
          {error && !data ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data ? (
            <ListSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState title="Nenhum gasto neste mês" hint='Clique em "Novo gasto" para cadastrar.' />
          ) : (
            <EntryList
              tone="expense"
              items={rows.map((r) => ({
                ...r,
                sign: "-" as const,
                badge: r.is_fixed ? (
                  <Badge variant="fixed">
                    <RepeatIcon /> Fixo
                  </Badge>
                ) : undefined,
              }))}
              onEdit={(id) => setDialog({ key: Date.now(), editing: rows.find((r) => r.id === id) })}
              onDelete={remove}
            />
          )}
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
            <CardDescription>Inclui os gastos fixos lançados no mês.</CardDescription>
          </CardHeader>
          {!data ? (
            <ListSkeleton rows={3} />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para o gráfico.</p>
          ) : (
            <CategoryPie data={groupSum(rows, (r) => r.category)} order={EXPENSE_CATEGORIES} />
          )}
        </Card>
      </div>

      {dialog && (
        <EntryDialog key={dialog.key} open onOpenChange={(o) => !o && setDialog(null)} config={config} initial={dialog.editing} onSubmit={save} />
      )}
    </>
  );
}
