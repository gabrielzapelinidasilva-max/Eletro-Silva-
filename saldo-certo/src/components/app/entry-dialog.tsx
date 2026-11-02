"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/auth/form-field";
import { amountSchema, dateSchema, descriptionSchema } from "@/lib/schemas";
import { parseBRL, todaySP, toBRLInput } from "@/lib/format";

export type EntryValues = {
  description: string;
  amount: number;
  date: string;
  category: string;
  operation?: string;
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
};

const formSchema = z.object({
  description: descriptionSchema,
  amount: amountSchema,
  date: dateSchema,
  category: z.string().min(1, "Escolha uma opção."),
  operation: z.string().optional(),
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
      config.operations
        ? formSchema.refine((v) => !!v.operation, { message: "Escolha a operação.", path: ["operation"] })
        : formSchema,
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
    });
    if (ok) onOpenChange(false);
  };

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
    };
  }
  return {
    description: initial.description,
    amount: toBRLInput(initial.amount),
    date: initial.date,
    category: initial.category,
    operation: initial.operation,
  };
}
