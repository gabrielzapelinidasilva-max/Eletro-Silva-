"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CandlestickChartIcon, Loader2Icon, SearchIcon, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/auth/form-field";
import { INVESTMENT_OPERATIONS, INVESTMENT_TYPES, OPERATION_LABEL } from "@/lib/constants";
import type { Investment } from "@/lib/db-types";
import { formatBRL, formatDate, parseBRL, todaySP, toBRLInput } from "@/lib/format";
import { lookupQuote } from "@/lib/market-client";
import { isMarketType, normalizeTicker, TICKER_EXAMPLES, type Quote } from "@/lib/market-shared";
import { amountSchema, dateSchema, descriptionSchema } from "@/lib/schemas";
import { formatPct, formatRate, formatTerm, futureValue, RATE_PERIOD_LABEL, type RatePeriod } from "@/lib/yield";

/** O que o formulário devolve para salvar. */
export type InvestmentInput = {
  description: string;
  amount: number;
  date: string;
  type: string;
  operation: string;
  rate: number | null;
  rate_period: RatePeriod | null;
  term_months: number | null;
  ticker: string | null;
  purchase_price: number | null;
};

const schema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  date: dateSchema,
  type: z.string().min(1, "Escolha o tipo."),
  operation: z.enum(["aporte", "resgate"]),
  rate: z.string(),
  ratePeriod: z.enum(["mensal", "anual"]),
  termValue: z.string(),
  termUnit: z.enum(["meses", "anos"]),
  ticker: z.string(),
});
type Values = z.infer<typeof schema>;

type Lookup =
  | { status: "idle" }
  | { status: "loading"; key: string }
  | { status: "ok"; key: string; quote: Quote; priceAtDate: number }
  | { status: "error"; key: string; message: string };

const resolver = zodResolver(
  schema.superRefine((v, ctx) => {
    if (v.operation !== "aporte") return;
    if (isMarketType(v.type)) {
      if (v.ticker.trim() && !normalizeTicker(v.ticker)) {
        ctx.addIssue({ code: "custom", message: "Código inválido. Use só letras e números (ex.: PETR4).", path: ["ticker"] });
      }
      return;
    }
    if (!v.rate.trim()) return; // sem taxa: não calcula rendimento
    const rate = parseBRL(v.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      ctx.addIssue({ code: "custom", message: "Informe quanto rende, ex.: 1 ou 0,85.", path: ["rate"] });
    } else if (rate > 1000) {
      ctx.addIssue({ code: "custom", message: "Taxa alta demais.", path: ["rate"] });
    }
    const months = termMonths(v);
    if (!months) ctx.addIssue({ code: "custom", message: "Informe o prazo.", path: ["termValue"] });
    else if (months > 600) ctx.addIssue({ code: "custom", message: "Prazo máximo: 50 anos.", path: ["termValue"] });
  }),
);

export function InvestmentDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Investment;
  onSubmit: (values: InvestmentInput) => Promise<boolean>;
}) {
  const editing = Boolean(initial);
  const [defaults] = useState(() => toValues(initial));
  // Na edição, o preço de compra salvo vale enquanto o código e a data não mudarem.
  const [lookup, setLookup] = useState<Lookup>(() =>
    initial?.ticker && initial.purchase_price
      ? {
          status: "ok",
          key: lookupKey(initial.ticker, initial.type, initial.date),
          quote: { ticker: initial.ticker, symbol: initial.ticker, name: initial.ticker, currency: "BRL", price: Number(initial.purchase_price), change12m: null, monthlyAvg: null, asOf: "" },
          priceAtDate: Number(initial.purchase_price),
        }
      : { status: "idle" },
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver, defaultValues: defaults });
  const v = useWatch({ control }) as Values;

  const isAporte = v.operation === "aporte";
  const market = isAporte && isMarketType(v.type);
  const fixed = isAporte && !isMarketType(v.type);
  const ticker = normalizeTicker(v.ticker ?? "");
  const currentKey = ticker ? lookupKey(ticker, v.type, v.date) : "";

  /** Busca a cotação; devolve o resultado (ou null) para quem chamou. */
  const runLookup = async (): Promise<Lookup | null> => {
    if (!ticker || !isMarketType(v.type)) return null;
    const key = currentKey;
    setLookup({ status: "loading", key });
    try {
      const { quote, priceAtDate } = await lookupQuote(ticker, v.type, v.date);
      const next: Lookup = { status: "ok", key, quote, priceAtDate: priceAtDate ?? quote.price };
      setLookup(next);
      return next;
    } catch (err) {
      const next: Lookup = { status: "error", key, message: err instanceof Error ? err.message : "Erro na cotação." };
      setLookup(next);
      return next;
    }
  };

  const submit = async (values: Values) => {
    const amount = parseBRL(values.amount);
    const base = {
      description: values.description.trim(),
      amount,
      date: values.date,
      type: values.type,
      operation: values.operation,
      rate: null,
      rate_period: null,
      term_months: null,
      ticker: null,
      purchase_price: null,
    } satisfies InvestmentInput;

    let payload: InvestmentInput = base;
    if (values.operation === "aporte" && isMarketType(values.type) && ticker) {
      // Garante uma cotação para o código e a data atuais antes de salvar.
      const result = lookup.status === "ok" && lookup.key === currentKey ? lookup : await runLookup();
      if (!result || result.status !== "ok") {
        setError("ticker", { message: result?.status === "error" ? result.message : "Não consegui buscar a cotação." });
        return;
      }
      const months = termMonths(values);
      payload = { ...base, ticker, purchase_price: result.priceAtDate, term_months: months && months <= 600 ? months : null };
    } else if (values.operation === "aporte" && !isMarketType(values.type) && values.rate.trim()) {
      payload = { ...base, rate: parseBRL(values.rate), rate_period: values.ratePeriod, term_months: termMonths(values) };
    }

    if (await onSubmit(payload)) onOpenChange(false);
  };

  // Prévias
  const amount = parseBRL(v.amount ?? "");
  const rate = parseBRL(v.rate ?? "");
  const months = termMonths(v);
  const fixedPreview = fixed && amount > 0 && rate > 0 && months > 0 && months <= 600 ? futureValue(amount, rate, v.ratePeriod, months) : null;
  const ok = lookup.status === "ok" && lookup.key === currentKey && lookup.quote.asOf ? lookup : null;
  const marketNow = ok && amount > 0 ? (amount * ok.quote.price) / ok.priceAtDate : null;
  const marketFuture =
    ok && marketNow !== null && ok.quote.monthlyAvg !== null && months > 0 && months <= 600
      ? marketNow * Math.pow(1 + ok.quote.monthlyAvg, months)
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          <DialogDescription>Preencha os dados e clique em salvar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
          <FormField id="description" label="Descrição" error={errors.description?.message}>
            <Input id="description" autoFocus maxLength={120} placeholder="Ex.: CDB Banco X, Ações Petrobras" aria-invalid={!!errors.description} {...register("description")} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="amount" label="Valor (R$)" error={errors.amount?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">R$</span>
                <Input id="amount" inputMode="decimal" placeholder="0,00" className="pl-9 tabular-nums" aria-invalid={!!errors.amount} {...register("amount")} />
              </div>
            </FormField>
            <FormField id="date" label="Data" error={errors.date?.message}>
              <Input id="date" type="date" aria-invalid={!!errors.date} {...register("date")} />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="type" label="Tipo" error={errors.type?.message}>
              <SelectField control={control} name="type" id="type" options={INVESTMENT_TYPES.map((t) => ({ value: t, label: t }))} />
            </FormField>
            <FormField id="operation" label="Operação" error={errors.operation?.message}>
              <SelectField control={control} name="operation" id="operation" options={INVESTMENT_OPERATIONS.map((o) => ({ value: o, label: OPERATION_LABEL[o] }))} />
            </FormField>
          </div>

          {fixed && (
            <Section icon={<TrendingUpIcon className="size-4 text-invest" />} title="Quanto rende" hint="Coloque a taxa que o banco ou a corretora informou. Deixe em branco para não calcular.">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="rate" label="Rendimento (%)" error={errors.rate?.message}>
                  <div className="flex gap-2">
                    <Input id="rate" inputMode="decimal" placeholder="Ex.: 1" className="min-w-0 tabular-nums" aria-invalid={!!errors.rate} {...register("rate")} />
                    <SelectField control={control} name="ratePeriod" ariaLabel="Período da taxa" className="w-[6.5rem] shrink-0" options={[{ value: "mensal", label: "ao mês" }, { value: "anual", label: "ao ano" }]} />
                  </div>
                </FormField>
                <TermField register={register} control={control} error={errors.termValue?.message} />
              </div>
              {fixedPreview !== null && (
                <p className="rounded-xl bg-surface px-3 py-2 text-sm">
                  {formatBRL(amount)} a {formatRate(rate)} {RATE_PERIOD_LABEL[v.ratePeriod]} por {formatTerm(months)} vira{" "}
                  <strong className="text-invest">{formatBRL(fixedPreview)}</strong>{" "}
                  <span className="text-income">(+ {formatBRL(fixedPreview - amount)})</span>
                </p>
              )}
            </Section>
          )}

          {market && (
            <Section icon={<CandlestickChartIcon className="size-4 text-invest" />} title="Cotação de mercado" hint="Com o código do ativo, o app busca a cotação real e mostra quanto seu aporte vale hoje.">
              <FormField id="ticker" label="Código do ativo" error={errors.ticker?.message}>
                <div className="flex gap-2">
                  <Input
                    id="ticker"
                    placeholder={TICKER_EXAMPLES[v.type as keyof typeof TICKER_EXAMPLES]}
                    autoCapitalize="characters"
                    className="min-w-0 uppercase"
                    aria-invalid={!!errors.ticker}
                    {...register("ticker")}
                  />
                  <Button type="button" variant="outline" onClick={runLookup} disabled={!ticker || lookup.status === "loading"}>
                    {lookup.status === "loading" ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                    Buscar
                  </Button>
                </div>
              </FormField>

              {lookup.status === "error" && lookup.key === currentKey && (
                <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">{lookup.message}</p>
              )}

              {ok && (
                <div className="grid gap-1 rounded-xl bg-surface px-3 py-2.5 text-sm">
                  <p className="font-semibold">
                    {ok.quote.ticker} · <span className="font-normal text-muted-foreground">{ok.quote.name}</span>
                  </p>
                  <p>
                    Cotação agora: <strong>{formatBRL(ok.quote.price)}</strong>
                    {ok.quote.currency !== "BRL" && <span className="text-muted-foreground"> (convertido de {ok.quote.currency})</span>}
                  </p>
                  <p>
                    Em {formatDate(v.date)}: <strong>{formatBRL(ok.priceAtDate)}</strong>
                  </p>
                  {ok.quote.change12m !== null && (
                    <p>
                      Últimos 12 meses:{" "}
                      <strong className={ok.quote.change12m >= 0 ? "text-income" : "text-expense"}>{formatPct(ok.quote.change12m)}</strong>{" "}
                      <span className="text-muted-foreground">(≈ {formatPct(ok.quote.monthlyAvg ?? 0)} ao mês)</span>
                    </p>
                  )}
                  {marketNow !== null && (
                    <p className="mt-1 border-t border-border pt-1.5">
                      Seu aporte vale hoje ≈ <strong className="text-invest">{formatBRL(marketNow)}</strong>{" "}
                      <span className={marketNow >= amount ? "text-income" : "text-expense"}>({formatPct(marketNow / amount - 1)})</span>
                    </p>
                  )}
                </div>
              )}

              {ok && ok.quote.monthlyAvg !== null && (
                <>
                  <TermField register={register} control={control} error={errors.termValue?.message} label="Projetar por (opcional)" />
                  {marketFuture !== null && (
                    <p className="rounded-xl bg-surface px-3 py-2 text-sm">
                      Se continuar no ritmo dos últimos 12 meses, em {formatTerm(months)}:{" "}
                      <strong className="text-invest">{formatBRL(marketFuture)}</strong>
                      <span className="block text-xs text-muted-foreground">Rentabilidade passada não garante rentabilidade futura.</span>
                    </p>
                  )}
                </>
              )}
            </Section>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-invest/25 bg-invest/5 p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

type SelectFieldProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  name: keyof Values;
  id?: string;
  ariaLabel?: string;
  className?: string;
  options: { value: string; label: string }[];
};

function SelectField({ control, name, id, ariaLabel, className, options }: SelectFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value as string} onValueChange={field.onChange}>
          <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

function TermField({
  register,
  control,
  error,
  label = "Por quanto tempo",
}: {
  register: ReturnType<typeof useForm<Values>>["register"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  error?: string;
  label?: string;
}) {
  return (
    <FormField id="termValue" label={label} error={error}>
      <div className="flex gap-2">
        <Input id="termValue" inputMode="numeric" placeholder="Ex.: 12" className="min-w-0 tabular-nums" {...register("termValue")} />
        <SelectField control={control} name="termUnit" ariaLabel="Unidade do prazo" className="w-[6.5rem] shrink-0" options={[{ value: "meses", label: "meses" }, { value: "anos", label: "anos" }]} />
      </div>
    </FormField>
  );
}

function lookupKey(ticker: string, type: string, date: string) {
  return `${ticker}|${type}|${date}`;
}

/** Prazo digitado → meses (0 se vazio ou inválido). */
function termMonths(v: Pick<Values, "termValue" | "termUnit">) {
  const n = Number((v.termValue ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * (v.termUnit === "anos" ? 12 : 1);
}

function toValues(initial?: Investment): Values {
  if (!initial) {
    return {
      description: "",
      amount: "",
      date: todaySP(),
      type: "",
      operation: "aporte",
      rate: "",
      ratePeriod: "mensal",
      termValue: "12",
      termUnit: "meses",
      ticker: "",
    };
  }
  const m = initial.term_months ?? 12;
  const inYears = m % 12 === 0;
  return {
    description: initial.description,
    amount: toBRLInput(Number(initial.amount)),
    date: initial.date,
    type: initial.type,
    operation: initial.operation as Values["operation"],
    rate: initial.rate != null ? String(Number(initial.rate)).replace(".", ",") : "",
    ratePeriod: (initial.rate_period as RatePeriod) ?? "mensal",
    termValue: initial.term_months == null && initial.ticker ? "" : String(inYears ? m / 12 : m),
    termUnit: inYears ? "anos" : "meses",
    ticker: initial.ticker ?? "",
  };
}
