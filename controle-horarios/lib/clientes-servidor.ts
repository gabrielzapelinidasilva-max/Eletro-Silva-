import "server-only";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Se o admin marcou "cadastrar cliente novo" ao agendar, cadastra nome, endereço e telefone.
 * Nome repetido é ignorado (o banco não deixa cadastrar duas vezes).
 */
export async function cadastrarClienteSeNovo(supabase: Supa, form: FormData) {
  if (form.get("salvar_cliente") !== "1") return;
  const texto = (c: string) => String(form.get(c) ?? "").trim();
  const nome = texto("cliente").replace(/\s+/g, " ").slice(0, 200);
  if (!nome) return;
  await supabase.from("clientes").insert({
    nome,
    endereco: texto("endereco").slice(0, 300) || null,
    telefone: texto("telefone").slice(0, 30) || null,
  });
}
