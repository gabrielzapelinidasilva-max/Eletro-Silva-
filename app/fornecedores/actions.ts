"use server";

import { getSupabase } from "@/lib/supabase";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

const CAMPOS = ["empresa", "contato", "telefone", "email", "produtos"] as const;

export async function enviarFornecedor(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  // Campo escondido para barrar robôs
  if (String(formData.get("site") ?? "")) return { ok: true, mensagem: "Recebemos seu contato. Obrigado!" };

  const dados = Object.fromEntries(CAMPOS.map((c) => [c, String(formData.get(c) ?? "").trim()])) as Record<
    (typeof CAMPOS)[number],
    string
  >;

  if (CAMPOS.some((c) => dados[c].length < 2)) {
    return { ok: false, mensagem: "Preencha todos os campos." };
  }
  if (!/^\S+@\S+\.\S+$/.test(dados.email)) {
    return { ok: false, mensagem: "Informe um e-mail válido." };
  }

  const sb = getSupabase();
  if (!sb) {
    return { ok: false, mensagem: "Formulário indisponível no momento. Use o botão do WhatsApp acima." };
  }

  const { error } = await sb.from("fornecedores_contatos").insert({
    empresa: dados.empresa.slice(0, 200),
    contato: dados.contato.slice(0, 200),
    telefone: dados.telefone.slice(0, 30),
    email: dados.email.slice(0, 200),
    produtos: dados.produtos.slice(0, 3000),
  });

  if (error) {
    console.error("Erro ao salvar fornecedor:", error.message);
    return { ok: false, mensagem: "Não foi possível enviar agora. Tente pelo WhatsApp." };
  }
  return { ok: true, mensagem: "Recebemos seu contato! Nosso setor de compras vai retornar em breve." };
}
