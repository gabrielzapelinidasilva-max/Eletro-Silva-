"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon, TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/auth/form-field";
import { amountSchema, dateSchema, descriptionSchema } from "@/lib/schemas";
import { formatBRL, parseBRL, todaySP, toBRLInput } from "@/lib/format";
import { formatRate, formatTerm, futureValue, RATE_PERIOD_LABEL, type RatePeriod } from "@/lib/yield";

export type EntryValues = {
  description: string;
  amount: number;
  date: string;
  category: string;
  operation?: string;
  /** Rendimento esperado (só investimentos do tipo aporte). */
  yield?: { ratePercent: number; period: RatePeriod; months: number } | null;
};

type Option = { value: string; label: string };

export type EntryDialogConfig = {
  /** Ex.: "ganho", "gasto" — usado nos títulos. */
  noun: string;
  categoryLabel: string;
  categories: readonly string[];
  dateLabel?: string;
  /** Data travada na edição (ex.: primeira cobrança do gasto fixo). */
  lockDateOnEdit?: string;
  operations?: Option[];
  /** Mostra a seção "Rendimento" (taxa e prazo) quando a operação é "aporte". */
  withYield?: boolean;
};

const formSchema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  date: dateSchema,
  category: z.string().min(1, "Escolha uma opção."),
  operation: z.string().optional(),
  hasYield: z.boolean(),
  rate: z.string(),
  ratePeriod: z.enum(["mensal", "anual"]),
  termValue: z.string(),
  termUnit: z.enum(["meses", "anos"]),
});
type FormValues = z.infer<typeof formSchema>;

export function EntryDialog({
  open,
  onOpenChange,
  config,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: EntryDialogConfig;
  /** Valores para edição; `undefined` = novo lançamento. */
  initial?: EntryValues;
  /** Deve devolver `true` se salvou (fecha o diálogo). */
  onSubmit: (values: EntryValues) => Promise<boolean>;
}) {
  const editing = Boolean(initial);
  const [defaults] = useState(() => toFormValues(initial, config));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      formSchema.superRefine((v, ctx) => {
        if (config.operations && !v.operation) {
          ctx.addIssue({ code: "custom", message: "Escolha a operação.", path: ["operation"] });
        }
        if (!yieldActive(config, v)) return;
        const rate = parseBRL(v.rate);
        if (!Number.isFinite(rate) || rate <= 0) {
          ctx.addIssue({ code: "custom", message: "Informe a taxa (ex.: 1 ou 12,5).", path: ["rate"] });
        } else if (rate > 1000) {
          ctx.addIssue({ code: "custom", message: "Taxa alta demais.", path: ["rate"] });
        }
        const months = termMonths(v);
        if (!months) {
          ctx.addIssue({ code: "custom", message: "Informe o prazo.", path: ["termValue"] });
        } else if (months > 600) {
          ctx.addIssue({ code: "custom", message: "Prazo máximo: 50 anos.", path: ["termValue"] });
        }
      }),
    ),
    defaultValues: defaults,
  });

  const submit = async (v: FormValues) => {
    const ok = await onSubmit({
      description: v.description.trim(),
      amount: parseBRL(v.amount),
      date: v.date,
      category: v.category,
      operation: v.operation,
      yield: yieldActive(config, v)
        ? { ratePercent: parseBRL(v.rate), period: v.ratePeriod, months: termMonths(v) }
        : null,
    });
    if (ok) onOpenChange(false);
  };

  // Prévia do rendimento enquanto o usuário digita.
  const live = useWatch({ control }) as FormValues;
  const showYield = config.withYield && live.operation === "aporte";
  const previewAmount = parseBRL(live.amount ?? "");
  const previewRate = parseBRL(live.rate ?? "");
  const previewMonths = termMonths(live);
  const preview =
    showYield && live.hasYield && previewAmount > 0 && previewRate > 0 && previewMonths > 0 && previewMonths <= 600
      ? futureValue(previewAmount, previewRate, live.ratePeriod, previewMonths)
      : null;

  const dateLocked = editing && config.lockDateOnEdit;

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${config.noun}` : `Novo ${config.noun}`}</DialogTitle>
          <DialogDescription>Preencha os dados e clique em salvar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
          <FormField id="description" label="Descrição" error={errors.description?.message}>
            <Input id="description" autoFocus maxLength={120} placeholder="Ex.: Mercado do mês" aria-invalid={!!errors.description} {...register("description")} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="amount" label="Valor (R$)" error={errors.amount?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">R$</span>
                <Input id="amount" inputMode="decimal" placeholder="0,00" className="pl-9 tabular-nums" aria-invalid={!!errors.amount} {...register("amount")} />
              </div>
            </FormField>
            <FormField id="date" label={config.dateLabel ?? "Data"} error={errors.date?.message}>
              <Input id="date" type="date" readOnly={!!dateLocked} className={dateLocked ? "opacity-60" : undefined} aria-invalid={!!errors.date} {...register("date")} />
            </FormField>
          </div>
          {dateLocked && <p className="-mt-2 text-xs text-muted-foreground">{config.lockDateOnEdit}</p>}

          <div className={config.operations ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            <FormField id="category" label={config.categoryLabel} error={errors.category?.message}>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category" aria-invalid={!!errors.category}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {config.operations && (
              <FormField id="operation" label="Operação" error={errors.operation?.message}>
                <Controller
                  control={control}
                  name="operation"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="operation" aria-invalid={!!errors.operation}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.operations!.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
          </div>

          {showYield && (
            <div className="grid gap-3 rounded-2xl border border-invest/25 bg-invest/5 p-4">
              <Controller
                control={control}
                name="hasYield"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUpIcon className="size-4 text-invest" />
                      Calcular quanto vai render
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Calcular quanto vai render" />
                  </label>
                )}
              />
              {live.hasYield && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id="rate" label="Taxa de juros (%)" error={errors.rate?.message}>
                      <div className="flex gap-2">
                        <Input id="rate" inputMode="decimal" placeholder="Ex.: 1" className="min-w-0 tabular-nums" aria-invalid={!!errors.rate} {...register("rate")} />
                        <Controller
                          control={control}
                          name="ratePeriod"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-[6.5rem] shrink-0" aria-label="Período da taxa">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mensal">ao mês</SelectItem>
                                <SelectItem value="anual">ao ano</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </FormField>
                    <FormField id="termValue" label="Por quanto tempo" error={errors.termValue?.message}>
                      <div className="flex gap-2">
                        <Input id="termValue" inputMode="numeric" placeholder="Ex.: 12" className="min-w-0 tabular-nums" aria-invalid={!!errors.termValue} {...register("termValue")} />
                        <Controller
                          control={control}
                          name="termUnit"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-[6.5rem] shrink-0" aria-label="Unidade do prazo">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="meses">meses</SelectItem>
                                <SelectItem value="anos">anos</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </FormField>
                  </div>
                  {preview !== null && (
                    <p className="rounded-xl bg-surface px-3 py-2 text-sm">
                      {formatBRL(previewAmount)} a {formatRate(previewRate)} {RATE_PERIOD_LABEL[live.ratePeriod]} por{" "}
                      {formatTerm(previewMonths)} vira <strong className="text-invest">{formatBRL(preview)}</strong>{" "}
                      <span className="text-income">(+ {formatBRL(preview - previewAmount)})</span>
                    </p>
                  )}
                </>
              )}
            </div>
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

function toFormValues(initial: EntryValues | undefined, config: EntryDialogConfig): FormValues {
  if (!initial) {
    return {
      description: "",
      amount: "",
      date: todaySP(),
      category: "",
      operation: config.operations ? config.operations[0].value : undefined,
      hasYield: false,
      rate: "",
      ratePeriod: "mensal",
      termValue: "12",
      termUnit: "meses",
    };
  }
  const y = initial.yield;
  const inYears = !!y && y.months % 12 === 0;
  return {
    description: initial.description,
    amount: toBRLInput(initial.amount),
    date: initial.date,
    category: initial.category,
    operation: initial.operation,
    hasYield: !!y,
    rate: y ? String(y.ratePercent).replace(".", ",") : "",
    ratePeriod: y?.period ?? "mensal",
    termValue: y ? String(inYears ? y.months / 12 : y.months) : "12",
    termUnit: inYears ? "anos" : "meses",
  };
}

function yieldActive(config: EntryDialogConfig, v: Pick<FormValues, "hasYield" | "operation">) {
  return Boolean(config.withYield && v.operation === "aporte" && v.hasYield);
}

/** Prazo digitado → meses (0 se inválido). */
function termMonths(v: Pick<FormValues, "termValue" | "termUnit">) {
  const n = Number((v.termValue ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * (v.termUnit === "anos" ? 12 : 1);
}
