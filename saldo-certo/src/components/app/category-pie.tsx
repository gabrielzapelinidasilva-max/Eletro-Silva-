"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { formatBRL } from "@/lib/format";

export type Slice = { name: string; value: number };

/** Agrupa linhas por uma chave e soma `amount`. */
export function groupSum<T extends { amount: number }>(rows: T[], key: (r: T) => string): Slice[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + Number(r.amount));
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function CategoryPie({ data, order }: { data: Slice[]; order: readonly string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colorOf = (name: string) => CHART_COLORS[Math.max(order.indexOf(name), 0) % CHART_COLORS.length];

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
      <div className="mx-auto h-52 w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="95%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={colorOf(d.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatBRL(Number(v))}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }}
              itemStyle={{ color: "var(--text)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid gap-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(d.name) }} />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-semibold tabular-nums">{formatBRL(d.value)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
              {total ? `${Math.round((d.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
