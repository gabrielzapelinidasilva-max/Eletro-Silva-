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

const OUTRA = "__outra__";

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

function ModalEquipamento({ estado, aoFechar, equipe, nomesLivres, aoSalvar }: {
  estado: { editar?: Equipamento; pessoa?: { id: string | null; nome: string } } | null;
  aoFechar: () => void;
  equipe: ReturnType<typeof useEquipe>["equipe"];
  nomesLivres: string[];
  aoSalvar: () => void;
}) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [pessoa, setPessoa] = useState("");
  const [nomeLivre, setNomeLivre] = useState("");
  const [item, setItem] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!estado) return;
    const e = estado.editar;
    const p = e ? { id: e.pessoa_id, nome: e.pessoa_nome ?? "" } : estado.pessoa;
    setPessoa(p ? (p.id ?? OUTRA) : "");
    setNomeLivre(p && !p.id ? p.nome : "");
    setItem(e?.item ?? "");
    setQuantidade(String(e?.quantidade ?? 1));
    setObservacao(e?.observacao ?? "");
    setErro("");
  }, [estado]);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    if (!pessoa) return setErro("Escolha a pessoa.");
    if (pessoa === OUTRA && !nomeLivre.trim()) return setErro("Digite o nome da pessoa.");
    const qtd = Number.parseInt(quantidade, 10);
    if (!Number.isFinite(qtd) || qtd < 0) return setErro("Quantidade inválida.");
    const dados = {
      pessoa_id: pessoa === OUTRA ? null : pessoa,
      pessoa_nome: pessoa === OUTRA ? nomeLivre.trim() : null,
      item: item.trim(),
      quantidade: qtd,
      observacao: observacao.trim() || null,
    };
    setSalvando(true);
    const { error } = estado?.editar
      ? await supabase.from("equipamentos").update(dados).eq("id", estado.editar.id)
      : await supabase.from("equipamentos").insert(dados);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    aoSalvar();
    aoFechar();
  }

  return (
    <Modal aberto={!!estado} aoFechar={aoFechar} titulo={estado?.editar ? "Editar equipamento" : "Adicionar equipamento"}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="eq-pessoa">Com quem está</label>
          <select id="eq-pessoa" className="campo" value={pessoa} onChange={(e) => setPessoa(e.target.value)} required>
            <option value="">Escolha…</option>
            {equipe.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            <option value={OUTRA}>Outra pessoa (digitar nome)</option>
          </select>
        </div>
        {pessoa === OUTRA && (
          <div>
            <label className="rotulo" htmlFor="eq-nome">Nome da pessoa</label>
            <input id="eq-nome" className="campo" list="eq-nomes" value={nomeLivre} onChange={(e) => setNomeLivre(e.target.value)} placeholder="Ex.: Gabriel" />
            <datalist id="eq-nomes">{nomesLivres.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        )}
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div>
            <label className="rotulo" htmlFor="eq-item">Equipamento</label>
            <input id="eq-item" className="campo" required value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex.: Ferramentas, Carros" />
          </div>
          <div>
            <label className="rotulo" htmlFor="eq-qtd">Quantidade</label>
            <input id="eq-qtd" className="campo text-center" type="number" inputMode="numeric" min={0} required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="eq-obs">Observação (opcional)</label>
          <input id="eq-obs" className="campo" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: placa ABC-1234" />
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
