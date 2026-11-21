"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, Aviso, Modal, Vazio } from "@/components/ui";
import { useEquipe } from "@/lib/hooks/useEquipe";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { cx, mensagemErro } from "@/lib/utils";

type Equipamento = {
  id: string;
  pessoa_id: string | null;
  pessoa_nome: string | null;
  item: string;
  quantidade: number;
  observacao: string | null;
  updated_at: string;
};

type Grupo = { chave: string; nome: string; pessoaId: string | null; itens: Equipamento[] };

export function TelaEquipamentos({ admin }: { admin: boolean }) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const { equipe, nomeDe } = useEquipe();
  const [lista, setLista] = useState<Equipamento[] | null>(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState<{ editar?: Equipamento; pessoa?: { id: string | null; nome: string } } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("equipamentos").select("*").order("item");
    if (error) setErro(mensagemErro(error));
    setLista((data as Equipamento[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel("equipamentos")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipamentos" }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [supabase, carregar]);

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, Grupo>();
    (lista ?? []).forEach((e) => {
      const nome = e.pessoa_id ? nomeDe(e.pessoa_id) : (e.pessoa_nome ?? "");
      const chave = e.pessoa_id ?? "nome:" + nome.trim().toLowerCase();
      if (!mapa.has(chave)) mapa.set(chave, { chave, nome, pessoaId: e.pessoa_id, itens: [] });
      mapa.get(chave)!.itens.push(e);
    });
    return [...mapa.values()]
      .map((g) => ({
        ...g,
        itens: termo && !g.nome.toLowerCase().includes(termo)
          ? g.itens.filter((i) => i.item.toLowerCase().includes(termo))
          : g.itens,
      }))
      .filter((g) => g.itens.length > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [lista, busca, nomeDe]);

  async function mudarQuantidade(e: Equipamento, delta: number) {
    const quantidade = Math.max(0, e.quantidade + delta);
    setLista((l) => l?.map((x) => (x.id === e.id ? { ...x, quantidade } : x)) ?? null);
    const { error } = await supabase.from("equipamentos").update({ quantidade }).eq("id", e.id);
    if (error) { setErro(mensagemErro(error)); carregar(); }
  }

  async function excluir(e: Equipamento) {
    if (!confirm(`Excluir "${e.item}"?`)) return;
    const { error } = await supabase.from("equipamentos").delete().eq("id", e.id);
    if (error) return setErro(mensagemErro(error));
    carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{admin ? "Equipamentos" : "Meus equipamentos"}</h1>
          <p className="text-sm text-black/55">{admin ? "O que está com cada pessoa." : "O que está com você."}</p>
        </div>
        {admin && (
          <button className="btn-primario" onClick={() => setModal({})}>
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        )}
      </div>

      {admin && (lista?.length ?? 0) > 0 && (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <span className="sr-only">Buscar</span>
          <input className="campo pl-10" type="search" placeholder="Buscar pessoa ou equipamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      )}

      <Aviso>{erro}</Aviso>

      {lista === null ? (
        <div className="cartao h-32 animate-pulse bg-white/60" />
      ) : grupos.length === 0 ? (
        <Vazio titulo={busca ? "Nada encontrado" : "Nenhum equipamento registrado"}>
          {admin && !busca ? "Clique em Adicionar para registrar o que está com cada pessoa." : ""}
        </Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {grupos.map((g) => {
            const total = g.itens.reduce((s, i) => s + i.quantidade, 0);
            return (
              <li key={g.chave} className="cartao overflow-hidden">
                <div className="flex items-center gap-3 border-b border-black/5 bg-bege/30 px-4 py-3">
                  <Avatar nome={g.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{g.nome}</p>
                    <p className="text-xs text-black/55">
                      {g.itens.length} {g.itens.length === 1 ? "tipo" : "tipos"} · {total} {total === 1 ? "unidade" : "unidades"}
                    </p>
                  </div>
                  {admin && (
                    <button className="btn-fantasma min-h-9 px-2" title={`Adicionar para ${g.nome}`} aria-label={`Adicionar para ${g.nome}`}
                            onClick={() => setModal({ pessoa: { id: g.pessoaId, nome: g.nome } })}>
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-black/5">
                  {g.itens.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="break-words">{e.item}</p>
                        {e.observacao && <p className="text-xs text-black/50">{e.observacao}</p>}
                      </div>
                      {admin ? (
                        <div className="flex items-center gap-1">
                          <button className="btn-secundario min-h-8 w-8 px-0" onClick={() => mudarQuantidade(e, -1)}
                                  disabled={e.quantidade === 0} aria-label={`Diminuir ${e.item}`}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className={cx("w-9 text-center text-lg font-bold tabular-nums", e.quantidade === 0 && "text-black/30")}>{e.quantidade}</span>
                          <button className="btn-secundario min-h-8 w-8 px-0" onClick={() => mudarQuantidade(e, 1)} aria-label={`Aumentar ${e.item}`}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button className="btn-fantasma min-h-8 px-1.5" onClick={() => setModal({ editar: e })} aria-label={`Editar ${e.item}`} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="btn-fantasma min-h-8 px-1.5 text-red-600" onClick={() => excluir(e)} aria-label={`Excluir ${e.item}`} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-lg font-bold tabular-nums">{e.quantidade}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {admin && (
        <ModalEquipamento
          estado={modal}
          aoFechar={() => setModal(null)}
          equipe={equipe}
          nomesLivres={[...new Set((lista ?? []).filter((e) => !e.pessoa_id && e.pessoa_nome).map((e) => e.pessoa_nome!))]}
          aoSalvar={carregar}
        />
      )}
    </div>
  );
}

type Linha = { item: string; quantidade: string; observacao: string };
const linhaVazia = (): Linha => ({ item: "", quantidade: "1", observacao: "" });

function ModalEquipamento({ estado, aoFechar, equipe, nomesLivres, aoSalvar }: {
  estado: { editar?: Equipamento; pessoa?: { id: string | null; nome: string } } | null;
  aoFechar: () => void;
  equipe: ReturnType<typeof useEquipe>["equipe"];
  nomesLivres: string[];
  aoSalvar: () => void;
}) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const editando = !!estado?.editar;

  useEffect(() => {
    if (!estado) return;
    const e = estado.editar;
    if (e) {
      setNome(e.pessoa_id ? (equipe.find((p) => p.id === e.pessoa_id)?.nome ?? "") : (e.pessoa_nome ?? ""));
      setLinhas([{ item: e.item, quantidade: String(e.quantidade), observacao: e.observacao ?? "" }]);
    } else {
      setNome(estado.pessoa?.nome ?? "");
      setLinhas([linhaVazia()]);
    }
    setErro("");
  }, [estado, equipe]);

  // Sugestões: quem tem cadastro + nomes já usados
  const sugestoes = useMemo(
    () => [...new Set([...equipe.filter((p) => p.ativo).map((p) => p.nome), ...nomesLivres])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [equipe, nomesLivres],
  );
  const cadastrado = equipe.find((p) => p.ativo && p.nome.trim().toLowerCase() === nome.trim().toLowerCase());

  const mudar = (idx: number, campo: keyof Linha, valor: string) =>
    setLinhas((l) => l.map((x, i) => (i === idx ? { ...x, [campo]: valor } : x)));

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    if (!nome.trim()) return setErro("Digite o nome da pessoa.");
    const preenchidas = linhas.filter((l) => l.item.trim());
    if (preenchidas.length === 0) return setErro("Preencha pelo menos um item.");
    for (const l of preenchidas) {
      const q = Number.parseInt(l.quantidade, 10);
      if (!Number.isFinite(q) || q < 0) return setErro(`Quantidade inválida em "${l.item}".`);
    }
    const pessoa = cadastrado ? { pessoa_id: cadastrado.id, pessoa_nome: null } : { pessoa_id: null, pessoa_nome: nome.trim() };
    const dados = preenchidas.map((l) => ({
      ...pessoa,
      item: l.item.trim(),
      quantidade: Number.parseInt(l.quantidade, 10),
      observacao: l.observacao.trim() || null,
    }));
    setSalvando(true);
    const { error } = estado?.editar
      ? await supabase.from("equipamentos").update(dados[0]).eq("id", estado.editar.id)
      : await supabase.from("equipamentos").insert(dados);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    aoSalvar();
    aoFechar();
  }

  return (
    <Modal aberto={!!estado} aoFechar={aoFechar} titulo={editando ? "Editar equipamento" : "Adicionar equipamentos"}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="eq-nome">Pessoa</label>
          <input id="eq-nome" className="campo" list="eq-sugestoes" autoComplete="off" required value={nome}
                 onChange={(e) => setNome(e.target.value)} placeholder="Digite o nome (ex.: Gabriel)" />
          <datalist id="eq-sugestoes">{sugestoes.map((n) => <option key={n} value={n} />)}</datalist>
          <p className="mt-1.5 text-xs text-black/50">
            {nome.trim()
              ? cadastrado
                ? "Pessoa cadastrada: ela também verá esses itens quando entrar no site."
                : "Nome livre: não precisa ter cadastro."
              : "Pode ser qualquer nome, com ou sem cadastro."}
          </p>
        </div>

        <div className="space-y-3">
          <span className="rotulo">{editando ? "Equipamento" : "Equipamentos"}</span>
          {linhas.map((l, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-black/10 bg-bege-claro/60 p-3">
              <div className="grid grid-cols-[1fr_5.5rem_auto] items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-black/60" htmlFor={`eq-item-${idx}`}>Item</label>
                  <input id={`eq-item-${idx}`} className="campo" value={l.item} onChange={(e) => mudar(idx, "item", e.target.value)}
                         placeholder="Ex.: Ferramentas" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black/60" htmlFor={`eq-qtd-${idx}`}>Qtd.</label>
                  <input id={`eq-qtd-${idx}`} className="campo text-center" type="number" inputMode="numeric" min={0}
                         value={l.quantidade} onChange={(e) => mudar(idx, "quantidade", e.target.value)} />
                </div>
                {linhas.length > 1 ? (
                  <button type="button" className="btn-fantasma min-h-11 px-2 text-red-600" aria-label={`Remover linha ${idx + 1}`}
                          onClick={() => setLinhas((x) => x.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : <span className="w-2" />}
              </div>
              <input className="campo py-2 text-sm" value={l.observacao} onChange={(e) => mudar(idx, "observacao", e.target.value)}
                     placeholder="Observação (opcional), ex.: placa ABC-1234" aria-label={`Observação do item ${idx + 1}`} />
            </div>
          ))}
          {!editando && (
            <button type="button" className="btn-secundario w-full border-dashed" onClick={() => setLinhas((x) => [...x, linhaVazia()])}>
              <Plus className="h-4 w-4" /> Outro item
            </button>
          )}
        </div>

        <Aviso>{erro}</Aviso>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secundario" onClick={aoFechar}>Cancelar</button>
          <button className="btn-primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
