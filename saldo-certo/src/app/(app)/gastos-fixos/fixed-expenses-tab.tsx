"use client";

import { useState } from "react";
import { CalendarClockIcon, InfoIcon, PencilIcon, PlusIcon, RepeatIcon, WalletCardsIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmDelete } from "@/components/app/confirm-delete";
import { EntryDialog, type EntryDialogConfig, type EntryValues } from "@/components/app/entry-dialog";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { FixedExpense } from "@/lib/db-types";
import { formatBRL, formatDate, friendlyError, todaySP } from "@/lib/format";
import { run, unwrap } from "@/lib/mutations";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

const config: EntryDialogConfig = {
  noun: "gasto fixo",
  categoryLabel: "Categoria",
  categories: EXPENSE_CATEGORIES,
  dateLabel: "Primeira cobrança",
  lockDateOnEdit: "A data da primeira cobrança não pode ser alterada. Para mudar, exclua e cadastre de novo.",
};

/** Dias entre hoje (SP) e a data. */
function daysUntil(date: string) {
  const a = Date.parse(`${todaySP()}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function FixedExpensesTab() {
  const supabase = createClient();
  const [dialog, setDialog] = useState<{ key: number; editing?: FixedExpense } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data, error, loading, reload } = useQuery("fixed_expenses", async () =>
    unwrap(
      await supabase
        .from("fixed_expenses")
        .select("*")
        .order("active", { ascending: false })
        .order("next_charge_date", { ascending: true }),
    ),
  );
  const rows = data ?? [];
  const active = rows.filter((r) => r.active);
  // Cobrança a cada 30 dias ≈ valor mensal.
  const monthlyTotal = active.reduce((s, r) => s + Number(r.amount), 0);

  const save = async (v: EntryValues) => {
    if (dialog?.editing) {
      const ok = await run(
        supabase
          .from("fixed_expenses")
          .update({ description: v.description, amount: v.amount, category: v.category })
          .eq("id", dialog.editing.id),
        "Gasto fixo atualizado! As próximas cobranças usarão os novos dados.",
      );
      if (ok) reload();
      return ok;
    }
    const pastDue = v.date <= todaySP();
    const ok = await run(
      supabase.from("fixed_expenses").insert({ description: v.description, amount: v.amount, category: v.category, start_date: v.date }),
      pastDue
        ? "Gasto fixo cadastrado! As cobranças já vencidas foram lançadas em Gastos."
        : "Gasto fixo cadastrado!",
    );
    if (ok) reload();
    return ok;
  };

  const toggle = async (fe: FixedExpense, next: boolean) => {
    setToggling(fe.id);
    try {
      const { error } = await supabase.from("fixed_expenses").update({ active: next }).eq("id", fe.id);
      if (error) throw error;
      toast.success(next ? `"${fe.description}" reativado.` : `"${fe.description}" pausado. Nada será cobrado enquanto estiver pausado.`);
      reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setToggling(null);
    }
  };

  const remove = async (id: string) => {
    const ok = await run(supabase.from("fixed_expenses").delete().eq("id", id), "Gasto fixo excluído.");
    if (ok) reload();
    return ok;
  };

  return (
    <>
      <PageTitle
        title="Gastos Fixos"
        description="Contas recorrentes descontadas automaticamente a cada 30 dias"
        icon={RepeatIcon}
        tone="bg-fixed/12 text-fixed"
        action={
          <Button onClick={() => setDialog({ key: Date.now() })}>
            <PlusIcon /> Novo gasto fixo
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total mensal comprometido"
          value={monthlyTotal}
          icon={WalletCardsIcon}
          tone="fixed"
          loading={loading && !data}
          hint={`${active.length} ${active.length === 1 ? "conta ativa" : "contas ativas"}`}
        />
        <Card className="flex-row items-start gap-3 bg-fixed/5">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-fixed" />
          <p className="text-sm text-muted-foreground">
            Todo dia às 03:00 (horário de Brasília) o sistema lança em <strong className="text-foreground">Gastos</strong> as
            contas que venceram e agenda a próxima cobrança para 30 dias depois. Contas pausadas não são cobradas.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas contas recorrentes</CardTitle>
          <CardDescription>Use o botão ao lado de cada conta para pausar ou reativar.</CardDescription>
        </CardHeader>
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title="Nenhum gasto fixo cadastrado" hint="Cadastre aluguel, internet, academia, assinaturas..." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((fe) => {
              const days = daysUntil(fe.next_charge_date);
              return (
                <li key={fe.id} className={cn("flex flex-wrap items-center gap-3 py-3", !fe.active && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{fe.description}</p>
                      {!fe.active && <Badge variant="secondary">Pausado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fe.category} · desde {formatDate(fe.start_date)}
                    </p>
                    {fe.active && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-fixed">
                        <CalendarClockIcon className="size-3.5" />
                        Próxima cobrança: {formatDate(fe.next_charge_date)}
                        <span className="text-muted-foreground">
                          ({days <= 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`})
                        </span>
                      </p>
                    )}
                  </div>
                  <p className="font-semibold whitespace-nowrap text-fixed tabular-nums">{formatBRL(fe.amount)}</p>
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-2 pr-1 text-xs text-muted-foreground">
                      <Switch
                        checked={fe.active}
                        disabled={toggling === fe.id}
                        onCheckedChange={(v) => toggle(fe, v)}
                        aria-label={fe.active ? `Pausar ${fe.description}` : `Reativar ${fe.description}`}
                      />
                      <span className="hidden w-12 sm:inline">{fe.active ? "Ativo" : "Pausado"}</span>
                    </label>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Editar ${fe.description}`} onClick={() => setDialog({ key: Date.now(), editing: fe })}>
                      <PencilIcon />
                    </Button>
                    <ConfirmDelete
                      title="Excluir gasto fixo?"
                      description={`"${fe.description}" deixará de ser cobrado. Os gastos já lançados continuam na aba Gastos.`}
                      onConfirm={() => remove(fe.id)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {dialog && (
        <EntryDialog
          key={dialog.key}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          config={config}
          initial={dialog.editing ? { ...dialog.editing, date: dialog.editing.start_date } : undefined}
          onSubmit={save}
        />
      )}
    </>
  );
}
