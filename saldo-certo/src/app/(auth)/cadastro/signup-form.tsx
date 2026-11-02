"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/format";

type Values = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(signupSchema), defaultValues: { email: "", password: "", confirm: "" } });

  const onSubmit = async ({ email, password }: Values) => {
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/ganhos` },
    });
    if (error) return setError(friendlyError(error));
    // Se a confirmação de e-mail estiver desligada, já há sessão.
    if (data.session) {
      router.replace("/ganhos");
      router.refresh();
      return;
    }
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <Card className="items-center text-center">
        <MailCheckIcon className="size-10 text-income" />
        <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong className="text-foreground">{sentTo}</strong>. Abra o e-mail e
          clique no link para ativar sua conta.
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
        <h1 className="text-xl font-bold">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Comece a organizar seu dinheiro em minutos.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField id="password" label="Senha" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Mínimo de 6 caracteres" aria-invalid={!!errors.password} {...register("password")} />
        </FormField>
        <FormField id="confirm" label="Confirmar senha" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
        </FormField>
        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-primary-dark hover:underline dark:text-primary">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
