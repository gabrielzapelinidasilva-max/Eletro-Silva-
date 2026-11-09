"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL, parseBRL, toBRLInput } from "@/lib/format";
import { formatRate, formatTerm, projectSeries, RATE_PERIOD_LABEL, type RatePeriod } from "@/lib/yield";

export type SimulatorDefaults = {
  initial?: number;
  monthly?: number;
  ratePercent?: number;
  period?: RatePeriod;
  months?: number;
};

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Converte o texto digitado em número ≥ 0 (vazio = 0). */
function num(text: string) {
  const n = parseBRL(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function YieldSimulator({ defaults, showMonthly = true }: { defaults?: SimulatorDefaults; showMonthly?: boolean }) {
  const id = useId();
  const [initial, setInitial] = useState(defaults?.initial ? toBRLInput(defaults.initial) : "1.000,00");
  const [monthly, setMonthly] = useState(defaults?.monthly ? toBRLInput(defaults.monthly) : "");
  const [rate, setRate] = useState(defaults?.ratePercent ? String(defaults.ratePercent).replace(".", ",") : "1");
  const [period, setPeriod] = useState<RatePeriod>(defaults?.period ?? "mensal");
  const startMonths = defaults?.months ?? 12;
  const [termValue, setTermValue] = useState(
    String(startMonths % 12 === 0 && startMonths >= 12 ? startMonths / 12 : startMonths),
  );
  const [termUnit, setTermUnit] = useState<"meses" | "anos">(startMonths % 12 === 0 && startMonths >= 12 ? "anos" : "meses");

  const ratePercent = num(rate);
  const months = Math.min(600, Math.round(num(termValue) * (termUnit === "anos" ? 12 : 1)));
  const valid = ratePercent > 0 && months > 0 && (num(initial) > 0 || num(monthly) > 0);
  const series = valid
    ? projectSeries({ initial: num(initial), monthly: showMonthly ? num(monthly) : 0, ratePercent, period, months })
    : [];
  const last = series[series.length - 1];
  // Para prazos longos o gráfico mostra no máximo ~60 pontos.
  const step = Math.max(1, Math.ceil(months / 60));
  const chartData = series.filter((p) => p.month % step === 0 || p.month === months);

  return (
    <div className="grid gap-4">
      <div className={`grid gap-3 ${showMonthly ? "sm:grid-cols-2" : ""}`}>
        <Field id={`${id}-ini`} label="Valor aplicado (R$)">
          <MoneyInput id={`${id}-ini`} value={initial} onChange={setInitial} />
        </Field>
        {showMonthly && (
          <Field id={`${id}-mes`} label="Aporte todo mês (opcional)">
            <MoneyInput id={`${id}-mes`} value={monthly} onChange={setMonthly} placeholder="0,00" />
          </Field>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-taxa`} label="Taxa de juros (%)">
          <div className="flex gap-2">
            <Input id={`${id}-taxa`} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="min-w-0 tabular-nums" />
            <Select value={period} onValueChange={(v) => setPeriod(v as RatePeriod)}>
              <SelectTrigger className="w-28 shrink-0" aria-label="Período da taxa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">ao mês</SelectItem>
                <SelectItem value="anual">ao ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>
        <Field id={`${id}-prazo`} label="Por quanto tempo">
          <div className="flex gap-2">
            <Input id={`${id}-prazo`} inputMode="numeric" value={termValue} onChange={(e) => setTermValue(e.target.value.replace(/\D/g, ""))} className="min-w-0 tabular-nums" />
            <Select value={termUnit} onValueChange={(v) => setTermUnit(v as "meses" | "anos")}>
              <SelectTrigger className="w-28 shrink-0" aria-label="Unidade do prazo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meses">meses</SelectItem>
                <SelectItem value="anos">anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>

      {!valid ? (
        <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
          Preencha o valor, a taxa e o prazo para ver a projeção.
        </p>
      ) : (
        <>
          <div className="grid gap-2 rounded-2xl bg-invest/8 p-4 sm:grid-cols-3">
            <Result label="Valor final" value={formatBRL(last.total)} strong />
            <Result label="Total investido" value={formatBRL(last.invested)} />
            <Result label="Rendimento (juros)" value={`+ ${formatBRL(last.interest)}`} tone="text-income" />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {formatRate(ratePercent)} {RATE_PERIOD_LABEL[period]} por {formatTerm(months)}, com juros compostos. Valores
            brutos, sem descontar imposto de renda nem taxas.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => (months > 24 ? `${Math.round(Number(m) / 12)}a` : `${m}m`)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  // Começa perto do valor aplicado para o crescimento ficar visível.
                  domain={[(min: number) => Math.max(0, Math.floor(min * 0.97)), "auto"]}
                  tickFormatter={(v) => compact.format(Number(v))}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v, name) => [formatBRL(Number(v)), name]}
                  labelFormatter={(m) => `Mês ${m}`}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }}
                />
                <Area dataKey="total" name="Valor total" type="monotone" stroke="var(--invest)" fill="var(--invest)" fillOpacity={0.18} strokeWidth={2.5} />
                <Area dataKey="invested" name="Investido" type="monotone" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.08} strokeDasharray="4 4" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">R$</span>
      <Input id={id} inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="pl-9 tabular-nums" />
    </div>
  );
}

function Result({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "text-xl font-extrabold" : "text-base font-semibold"} ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
