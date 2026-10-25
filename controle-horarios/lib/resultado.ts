import type { Resultado } from "./tipos";

export function sucesso(mensagem: string): Resultado {
  return { ok: true, mensagem, em: Date.now() };
}

/** Devolve o que foi digitado para o formulário não perder os dados (o React limpa o form após o envio). */
function valoresDe(form?: FormData): Record<string, string> | undefined {
  if (!form) return undefined;
  const valores: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$") && !/senha/i.test(k)) valores[k] = v;
  });
  return valores;
}

export function falha(mensagem: string, form?: FormData, erros?: Record<string, string>): Resultado {
  return { ok: false, mensagem, erros, valores: valoresDe(form), em: Date.now() };
}

export function falhaValidacao(erros: Record<string, string>, form?: FormData): Resultado {
  return falha(Object.values(erros)[0] ?? "Confira os campos destacados.", form, erros);
}
