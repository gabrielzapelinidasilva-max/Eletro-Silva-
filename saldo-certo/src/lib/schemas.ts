import { z } from "zod";
import { parseBRL } from "@/lib/format";

export const emailSchema = z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.");
export const passwordSchema = z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72, "Senha longa demais.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const signupSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

/** Valor em R$ digitado como texto ("1.234,56"). */
export const amountSchema = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .refine((v) => Number.isFinite(parseBRL(v)), "Valor inválido. Use o formato 1.234,56.")
  .refine((v) => parseBRL(v) > 0, "O valor deve ser maior que zero.")
  .refine((v) => parseBRL(v) < 10_000_000_000, "Valor alto demais.")
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(parseBRL(v).toString()), "Use no máximo 2 casas decimais.");

export const descriptionSchema = z
  .string()
  .trim()
  .min(1, "Informe uma descrição.")
  .max(120, "Use no máximo 120 caracteres.");

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
