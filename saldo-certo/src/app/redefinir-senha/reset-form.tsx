"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";
import { resetSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/format";

type Values = z.infer<typeof resetSchema>;

export function ResetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = async ({ password }: Values) => {
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return setError(friendlyError(error));
    toast.success("Senha alterada com sucesso!");
    router.replace("/ganhos");
    router.refresh();
  };

  return (
    <Card>
      <div>
        <h1 className="text-xl font-bold">Criar nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField id="password" label="Nova senha" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </FormField>
        <FormField id="confirm" label="Confirmar nova senha" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
        </FormField>
        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </Card>
  );
}
