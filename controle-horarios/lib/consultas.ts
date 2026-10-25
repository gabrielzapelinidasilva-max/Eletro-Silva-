import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataValida, hojeSP, inicioMes } from "./datas";
import type { RegistroComPerfil } from "./tipos";

export type Filtros = {
  colaborador: string;
  de: string;
  ate: string;
  cliente: string;
  q: string;
};

type Parametros = Record<string, string | string[] | undefined>;

function primeiro(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Primeira data considerada quando o período fica em branco no histórico. */
export const INICIO_HISTORICO = "2000-01-01";

/**
 * Lê os filtros da URL. Sem período informado, usa o mês atual,
 * ou todo o histórico quando `todoPeriodo` for verdadeiro.
 */
export function lerFiltros(p: Parametros, { todoPeriodo = false } = {}): Filtros {
  const hoje = hojeSP();
  const de = primeiro(p.de);
  const ate = primeiro(p.ate);
  const colaborador = primeiro(p.colaborador);
  return {
    colaborador: /^[0-9a-f-]{36}$/i.test(colaborador) ? colaborador : "",
    de: dataValida(de) ? de : todoPeriodo ? INICIO_HISTORICO : inicioMes(hoje),
    ate: dataValida(ate) ? ate : hoje,
    cliente: primeiro(p.cliente).slice(0, 100),
    q: primeiro(p.q).slice(0, 100),
  };
}

export function filtrosParaURL(f: Filtros): string {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
}

/** Troca caracteres que têm significado especial nos filtros do Supabase por "qualquer coisa" (*). */
function limparBusca(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().replace(/[,()*%\\"]/g, "*");
}

const TAMANHO_PAGINA = 1000;
const MAXIMO = 20000;

/** Busca TODOS os registros que batem com os filtros (em páginas de 1000). */
export async function buscarRegistros(supabase: SupabaseClient, f: Filtros): Promise<RegistroComPerfil[]> {
  const resultado: RegistroComPerfil[] = [];
  const cliente = limparBusca(f.cliente);
  const q = limparBusca(f.q);

  for (let inicio = 0; inicio < MAXIMO; inicio += TAMANHO_PAGINA) {
    let consulta = supabase
      .from("registros")
      .select("*, profiles(nome)")
      .gte("data", f.de)
      .lte("data", f.ate)
      .order("data", { ascending: false })
      .order("hora_chegada", { ascending: false })
      .order("id")
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (f.colaborador) consulta = consulta.eq("usuario_id", f.colaborador);
    if (cliente) consulta = consulta.ilike("cliente", `*${cliente}*`);
    if (q) consulta = consulta.or(`cliente.ilike.*${q}*,servico.ilike.*${q}*,observacoes.ilike.*${q}*`);

    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    resultado.push(...((data ?? []) as RegistroComPerfil[]));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return resultado;
}

export type TotalColaborador = { usuario_id: string; nome: string; registros: number; minutos: number; emAberto: number };

export function totaisPorColaborador(registros: RegistroComPerfil[]): TotalColaborador[] {
  const mapa = new Map<string, TotalColaborador>();
  for (const r of registros) {
    const t = mapa.get(r.usuario_id) ?? { usuario_id: r.usuario_id, nome: r.profiles?.nome ?? "—", registros: 0, minutos: 0, emAberto: 0 };
    t.registros += 1;
    t.minutos += r.minutos_trabalhados ?? 0;
    if (!r.hora_saida) t.emAberto += 1;
    mapa.set(r.usuario_id, t);
  }
  return [...mapa.values()].sort((a, b) => b.minutos - a.minutos || a.nome.localeCompare(b.nome, "pt-BR"));
}

export type TotalCliente = {
  cliente: string;
  trabalhos: number;
  minutos: number;
  primeiraVisita: string;
  ultimaVisita: string;
  colaboradores: string[];
};

/** Agrupa os registros por cliente (ignorando maiúsculas/minúsculas e espaços extras). */
export function totaisPorCliente(registros: RegistroComPerfil[]): TotalCliente[] {
  const mapa = new Map<string, TotalCliente>();
  for (const r of registros) {
    const chave = r.cliente.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
    const t = mapa.get(chave) ?? { cliente: r.cliente.trim(), trabalhos: 0, minutos: 0, primeiraVisita: r.data, ultimaVisita: r.data, colaboradores: [] };
    t.trabalhos += 1;
    t.minutos += r.minutos_trabalhados ?? 0;
    if (r.data < t.primeiraVisita) t.primeiraVisita = r.data;
    if (r.data > t.ultimaVisita) t.ultimaVisita = r.data;
    const nome = r.profiles?.nome;
    if (nome && !t.colaboradores.includes(nome)) t.colaboradores.push(nome);
    mapa.set(chave, t);
  }
  return [...mapa.values()].sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita) || b.trabalhos - a.trabalhos);
}
