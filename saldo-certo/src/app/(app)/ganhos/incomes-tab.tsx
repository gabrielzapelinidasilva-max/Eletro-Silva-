"use client";

import { useState } from "react";
import { ArrowUpCircleIcon, PlusIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryDialog, type EntryDialogConfig, type EntryValues } from "@/components/app/entry-dialog";
import { EntryList } from "@/components/app/entry-list";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { CategoryPie, groupSum } from "@/components/app/category-pie";
import { INCOME_CATEGORIES } from "@/lib/constants";
import type { Income } from "@/lib/db-types";
import { formatMonth, monthRange } from "@/lib/format";
import { useMonth } from "@/lib/month-context";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";

const config: EntryDialogConfig = { noun: "ganho", categoryLabel: "Categoria", categories: INCOME_CATEGORIES };

export function IncomesTab() {
  const supabase = createClient();
  const { month } = useMonth();
  const { start, end } = monthRange(month);
  const [dialog, setDialog] = useState<{ key: number; editing?: Income } | null>(null);

  const { data, error, loading, reload } = useQuery(`incomes:${month}`, async () =>
    unwrap(
      await supabase
        .from("incomes")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
  );
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  const save = async (v: EntryValues) => {
    const payload = { description: v.description, amount: v.amount, date: v.date, category: v.category };
    const ok = dialog?.editing
      ? await run(supabase.from("incomes").update(payload).eq("id", dialog.editing.id), "Ganho atualizado!")
      : await run(supabase.from("incomes").insert(payload), "Ganho cadastrado!");
    if (ok) reload();
    return ok;
  };

  const remove = async (id: string) => {
    const ok = await run(supabase.from("incomes").delete().eq("id", id), "Ganho excluído.");
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <PageTitle
        title="Ganhos"
        description={`Entradas de ${formatMonth(month)}`}
        icon={ArrowUpCircleIcon}
        tone="bg-income/12 text-income"
        action={
          <Button onClick={() => setDialog({ key: Date.now() })}>
            <PlusIcon /> Novo ganho
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-4">
          <StatCard label="Total de ganhos no mês" value={total} icon={WalletIcon} tone="income" loading={loading && !data} />
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos</CardTitle>
            </CardHeader>
            {error && !data ? (
              <ErrorState message={error} onRetry={reload} />
            ) : !data ? (
              <ListSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState title="Nenhum ganho neste mês" hint='Clique em "Novo ganho" para cadastrar.' />
            ) : (
              <EntryList
                tone="income"
                items={rows.map((r) => ({ ...r, sign: "+" as const }))}
                onEdit={(id) => setDialog({ key: Date.now(), editing: rows.find((r) => r.id === id) })}
                onDelete={remove}
              />
            )}
          </Card>
        </div>
        {rows.length > 0 && (
          <Card className="content-start self-start">
            <CardHeader>
              <CardTitle>Por categoria</CardTitle>
            </CardHeader>
            <CategoryPie data={groupSum(rows, (r) => r.category)} order={INCOME_CATEGORIES} />
          </Card>
        )}
      </div>

      {dialog && (
        <EntryDialog
          key={dialog.key}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          config={config}
          initial={dialog.editing}
          onSubmit={save}
        />
      )}
    </>
  );
}
