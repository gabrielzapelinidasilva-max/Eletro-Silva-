import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageTitle({
  title,
  description,
  icon: Icon,
  tone,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-2xl", tone)}>
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
