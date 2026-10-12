import { getSupabase } from "./supabase";

export type Produto = {
  id: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
};

export type Oferta = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco_de: number | null;
  preco_por: number | null;
  imagem_url: string | null;
  valido_ate: string | null;
};

export type Sorteio = {
  id: string;
  titulo: string;
  regulamento: string;
  data_sorteio: string | null;
};

export async function getProdutos(): Promise<Produto[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("produtos")
    .select("id, categoria, nome, descricao, imagem_url")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) {
    console.error("Erro ao carregar produtos:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getOfertas(): Promise<Oferta[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("ofertas")
    .select("id, titulo, descricao, preco_de, preco_por, imagem_url, valido_ate")
    .eq("ativo", true)
    .or(`valido_ate.is.null,valido_ate.gte.${hoje}`)
    .order("ordem", { ascending: true });
  if (error) {
    console.error("Erro ao carregar ofertas:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getSorteioAtual(): Promise<Sorteio | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("sorteios")
    .select("id, titulo, regulamento, data_sorteio")
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar sorteio:", error.message);
    return null;
  }
  return data;
}

export function brl(v: number | null) {
  return v == null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
