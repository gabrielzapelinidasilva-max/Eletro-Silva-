"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/schemas";
import { friendlyError } from "@/lib/format";

type Values = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: Values) => {
    setError(null);
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) return setError(friendlyError(error));
    router.replace("/ganhos");
    router.refresh();
  };

  return (
    <Card>
      <div>
        <h1 className="text-xl font-bold">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para ver suas finanças.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField id="email" label="E-mail" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField id="password" label="Senha" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
        </FormField>
        <div className="-mt-2 text-right">
          <Link href="/esqueci-senha" className="text-sm font-medium text-primary-dark hover:underline dark:text-primary">
            Esqueci minha senha
          </Link>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-3 py-2 text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2Icon className="animate-spin" />}
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-primary-dark hover:underline dark:text-primary">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
