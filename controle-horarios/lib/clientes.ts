// Cadastro de clientes (usado para preencher a agenda automaticamente).

export type Cliente = { id: string; nome: string; endereco: string | null; telefone: string | null; observacoes: string | null };

/** Para comparar nomes sem diferença de maiúsculas, acentos e espaços. */
export function chaveNome(nome: string) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}
