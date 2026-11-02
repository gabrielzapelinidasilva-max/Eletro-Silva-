import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  loading,
  hint,
  className,
}: {
  label: string;
  value: number | null | undefined;
  icon: LucideIcon;
  tone: "income" | "expense" | "fixed" | "invest" | "primary";
  loading?: boolean;
  hint?: string;
  className?: string;
}) {
  const tones = {
    income: "bg-income/12 text-income",
    expense: "bg-expense/12 text-expense",
    fixed: "bg-fixed/12 text-fixed",
    invest: "bg-invest/12 text-invest",
    primary: "bg-primary/15 text-primary-dark dark:text-primary",
  } as const;
  return (
    <Card className={cn("gap-3", className)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-36" />
      ) : (
        <p className="text-2xl font-bold tracking-tight tabular-nums">{formatBRL(value)}</p>
      )}
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
