"use client";

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmDelete } from "./confirm-delete";

export type ListItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  badge?: React.ReactNode;
  /** "+" para entradas, "-" para saídas. */
  sign?: "+" | "-";
  /** Linha extra abaixo da data (ex.: projeção do rendimento). */
  details?: React.ReactNode;
  /** Botões extras antes de editar/excluir. */
  actions?: React.ReactNode;
};

export function EntryList({
  items,
  tone,
  onEdit,
  onDelete,
}: {
  items: ListItem[];
  tone: "income" | "expense" | "invest";
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const toneText = { income: "text-income", expense: "text-expense", invest: "text-invest" }[tone];
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{it.description}</p>
              {it.badge}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(it.date)} · {it.category}
            </p>
            {it.details}
          </div>
          <p className={cn("text-right font-semibold whitespace-nowrap tabular-nums", toneText)}>
            {it.sign === "-" ? "− " : it.sign === "+" ? "+ " : ""}
            {formatBRL(it.amount)}
          </p>
          <div className="flex">
            {it.actions}
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Editar ${it.description}`} onClick={() => onEdit(it.id)}>
              <PencilIcon />
            </Button>
            <ConfirmDelete
              description={`"${it.description}" de ${formatBRL(it.amount)} será excluído. Essa ação não pode ser desfeita.`}
              onConfirm={() => onDelete(it.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
