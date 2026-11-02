"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2Icon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/auth/form-field";
import { createClient } from "@/lib/supabase/client";
import { forgotSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/format";

type Values = z.infer<typeof forgotSchema>;

export function ForgotForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: Values) => {
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    if (error) return setError(friendlyError(error));
    setSent(true);
  };

  if (sent) {
    return (
      <Card className="items-center text-center">
        <MailIcon className="size-10 text-primary" />
        <h1 className="text-xl font-bold">Verifique seu e-mail</h1>
        <p className="text-sm text-muted-foreground">
          Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <div>
        <h1 className="text-xl font-bold">Esqueci minha senha</h1>
        <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {isSubmitting ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-primary-dark hover:underline dark:text-primary">
          Voltar para o login
        </Link>
      </p>
    </Card>
  );
}
