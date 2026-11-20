"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Aviso, Modal, Vazio } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { ItemModelo, Modelo } from "@/lib/tipos";
import { cx, mensagemErro } from "@/lib/utils";

type ModeloCompleto = Modelo & { template_items: ItemModelo[] };

export function TelaModelos() {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [modelos, setModelos] = useState<ModeloCompleto[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("templates").select("*, template_items(*)").order("nome");
    if (error) setErro(mensagemErro(error));
    setModelos(((data as ModeloCompleto[]) ?? []).map((m) => ({ ...m, template_items: m.template_items.sort((a, b) => a.posicao - b.posicao) })));
  }, [supabase]);

  useEffect(() => { carregar(); }, [carregar]);

  async function excluir(m: ModeloCompleto) {
    if (!confirm(`Excluir o modelo "${m.nome}"? Os checklists já criados com ele não mudam.`)) return;
    const { error } = await supabase.from("templates").delete().eq("id", m.id);
    if (error) return setErro(mensagemErro(error));
    carregar();
  }

  async function addItem(m: ModeloCompleto, texto: string) {
    const posicao = (m.template_items.at(-1)?.posicao ?? 0) + 1;
    const { error } = await supabase.from("template_items").insert({ template_id: m.id, texto, posicao });
    if (error) return setErro(mensagemErro(error));
    carregar();
  }

  async function removerItem(id: string) {
    const { error } = await supabase.from("template_items").delete().eq("id", id);
    if (error) return setErro(mensagemErro(error));
    carregar();
  }

  async function renomear(m: ModeloCompleto, nome: string) {
    if (!nome.trim() || nome === m.nome) return;
    const { error } = await supabase.from("templates").update({ nome: nome.trim() }).eq("id", m.id);
    if (error) return setErro(mensagemErro(error));
    carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelos</h1>
          <p className="text-sm text-black/55">Listas prontas para criar checklists repetidos (abertura da loja, serviço…).</p>
        </div>
        <button className="btn-primario" onClick={() => setCriando(true)}><Plus className="h-4 w-4" /> Novo modelo</button>
      </div>
      <Aviso>{erro}</Aviso>

      {modelos === null ? (
        <div className="cartao h-32 animate-pulse bg-white/60" />
      ) : modelos.length === 0 ? (
        <Vazio titulo="Nenhum modelo ainda">
          Crie um aqui ou abra um checklist e use o botão <strong>Salvar como modelo</strong>.
        </Vazio>
      ) : (
        <ul className="space-y-3">
          {modelos.map((m) => (
            <li key={m.id} className="cartao">
              <div className="flex items-center gap-2 p-4">
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setAberto(aberto === m.id ? null : m.id)}
                        aria-expanded={aberto === m.id}>
                  <ChevronDown className={cx("h-4 w-4 shrink-0 transition", aberto === m.id && "rotate-180")} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.nome}</span>
                    <span className="text-xs text-black/50">{m.template_items.length} itens</span>
                  </span>
                </button>
                <Link href={`/admin/checklists/novo?modelo=${m.id}`} className="btn-primario min-h-10 px-3">Usar</Link>
              </div>
              {aberto === m.id && (
                <div className="space-y-3 border-t border-black/5 p-4">
                  <div>
                    <label className="rotulo" htmlFor={`nome-${m.id}`}>Nome</label>
                    <input id={`nome-${m.id}`} className="campo" defaultValue={m.nome} onBlur={(e) => renomear(m, e.target.value)} />
                  </div>
                  <ol className="space-y-1.5">
                    {m.template_items.map((i, idx) => (
                      <li key={i.id} className="flex items-center gap-2 rounded-lg bg-bege-claro px-3 py-2 text-sm">
                        <span className="w-5 text-black/40 tabular-nums">{idx + 1}.</span>
                        <span className="flex-1 break-words">{i.texto}</span>
                        <button className="text-black/40 hover:text-red-600" onClick={() => removerItem(i.id)} aria-label={`Remover ${i.texto}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <form className="flex gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    const campo = e.currentTarget.elements.namedItem("texto") as HTMLInputElement;
                    if (campo.value.trim()) { addItem(m, campo.value.trim()); campo.value = ""; }
                  }}>
                    <input name="texto" className="campo" placeholder="Novo item do modelo…" aria-label="Novo item do modelo" />
                    <button className="btn-secundario shrink-0 px-3" aria-label="Adicionar"><Plus className="h-5 w-5" /></button>
                  </form>
                  <button className="btn-fantasma text-red-600" onClick={() => excluir(m)}><Trash2 className="h-4 w-4" /> Excluir modelo</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <NovoModelo aberto={criando} aoFechar={() => setCriando(false)} aoCriar={carregar} />
    </div>
  );
}

function NovoModelo({ aberto, aoFechar, aoCriar }: { aberto: boolean; aoFechar: () => void; aoCriar: () => void }) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState("");
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("templates").insert({ nome: nome.trim() }).select("id").single();
    if (error) return setErro(mensagemErro(error));
    const linhas = itens.split("\n").map((l) => l.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);
    if (linhas.length) {
      const { error: e2 } = await supabase.from("template_items").insert(linhas.map((texto, i) => ({ template_id: data.id, texto, posicao: i + 1 })));
      if (e2) return setErro(mensagemErro(e2));
    }
    setNome(""); setItens(""); setErro("");
    aoCriar();
    aoFechar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo modelo">
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="nm-nome">Nome</label>
          <input id="nm-nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Abertura da loja" />
        </div>
        <div>
          <label className="rotulo" htmlFor="nm-itens">Itens (um por linha)</label>
          <textarea id="nm-itens" className="campo min-h-36 font-mono text-sm" value={itens} onChange={(e) => setItens(e.target.value)} />
        </div>
        <Aviso>{erro}</Aviso>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secundario" onClick={aoFechar}>Cancelar</button>
          <button className="btn-primario">Criar modelo</button>
        </div>
      </form>
    </Modal>
  );
}
