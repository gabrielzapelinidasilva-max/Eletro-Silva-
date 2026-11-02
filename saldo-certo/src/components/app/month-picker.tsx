"use client";

import { useState } from "react";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMonth } from "@/lib/month-context";
import { addMonths, currentMonthSP, formatMonth, monthName } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MonthPicker() {
  const { month, setMonth } = useMonth();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const current = currentMonthSP();

  const openPicker = () => {
    setYear(Number(month.slice(0, 4)));
    setOpen(true);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface p-1 shadow-sm ring-1 ring-border">
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">
        <ChevronLeftIcon />
      </Button>
      <button
        type="button"
        onClick={openPicker}
        className="flex min-w-36 items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold capitalize hover:bg-muted"
        aria-label={`Mês selecionado: ${formatMonth(month)}. Clique para escolher outro mês.`}
      >
        <CalendarDaysIcon className="size-4 text-primary-dark dark:text-primary" />
        {formatMonth(month)}
      </button>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
        <ChevronRightIcon />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escolher mês</DialogTitle>
            <DialogDescription>Todas as abas mostram os dados do mês escolhido.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior">
              <ChevronLeftIcon />
            </Button>
            <span className="text-lg font-bold">{year}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano">
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = ym === month;
              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => {
                    setMonth(ym);
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded-xl py-2.5 text-sm font-medium capitalize transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
                    !selected && ym === current && "ring-2 ring-primary",
                  )}
                >
                  {monthName(i).slice(0, 3)}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setMonth(current);
              setOpen(false);
            }}
          >
            Ir para o mês atual
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
