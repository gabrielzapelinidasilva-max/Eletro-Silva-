"use client";

import { toast } from "sonner";
import { friendlyError } from "@/lib/format";

/** Executa uma operação do Supabase mostrando toast de sucesso/erro. */
export async function run(
  op: PromiseLike<{ error: unknown }>,
  success: string,
): Promise<boolean> {
  try {
    const { error } = await op;
    if (error) {
      toast.error(friendlyError(error));
      return false;
    }
    toast.success(success);
    return true;
  } catch (err) {
    toast.error(friendlyError(err));
    return false;
  }
}

/** Lança erro se a resposta do Supabase tiver erro (para usar dentro do useQuery). */
export function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}
