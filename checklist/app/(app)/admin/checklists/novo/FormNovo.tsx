"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Aviso } from "@/components/ui";
import { SeletorPessoas } from "@/components/SeletorPessoas";
import { useEquipe } from "@/lib/hooks/useEquipe";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { Modelo } from "@/lib/tipos";
import { mensagemErro } from "@/lib/utils";

export function FormNovo() {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const router = useRouter();
  const params = useSearchParams();
  const { equipe } = useEquipe();

  const [modelos, setModelos] = useState<(Modelo & { template_items: { id: string }[] })[]>([]);
  const [modelo, setModelo] = useState(params.get("modelo") ?? "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [itensTexto, setItensTexto] = useState("");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.from("templates").select("*, template_items(id)").order("nome").then(({ data }) => {
      const lista = (data as typeof modelos) ?? [];
      setModelos(lista);
      const m = lista.find((x) => x.id === params.get("modelo"));
      if (m) { setTitulo(m.nome); setDescricao(m.descricao ?? ""); }
    });
  }, [supabase, params]);

  function escolherModelo(id: string) {
    setModelo(id);
    const m = modelos.find((x) => x.id === id);
    if (m) { setTitulo(m.nome); setDescricao(m.descricao ?? ""); }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    let id: string | null = null;

    if (modelo) {
      const { data, error } = await supabase.rpc("criar_de_modelo", {
        p_template: modelo, p_titulo: titulo, p_descricao: descricao, p_prazo: prazo || null,
      });
      if (error) { setSalvando(false); return setErro(mensagemErro(error)); }
      id = data as string;
    } else {
      const { data, error } = await supabase.from("checklists")
        .insert({ titulo: titulo.trim(), descricao: descricao.trim() || null, prazo: prazo || null })
        .select("id").single();
      if (error) { setSalvando(false); return setErro(mensagemErro(error)); }
      id = data.id;
      const linhas = itensTexto.split("\n").map((l) => l.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);
      if (linhas.length) {
        const { error: e2 } = await supabase.from("checklist_items")
          .insert(linhas.map((texto, i) => ({ checklist_id: id, texto, posicao: i + 1 })));
        if (e2) setErro(mensagemErro(e2));
      }
    }

    if (responsaveis.length) {
      await supabase.from("checklist_members").insert(responsaveis.map((user_id) => ({ checklist_id: id, user_id })));
    }
    router.replace(`/checklists/${id}`);
  }

  const modeloEscolhido = modelos.find((m) => m.id === modelo);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-black/55 hover:text-tinta">
        <ArrowLeft className="h-4 w-4" /> Checklists
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Novo checklist</h1>

      <form onSubmit={criar} className="cartao space-y-5 p-5">
        {modelos.length > 0 && (
          <div>
            <label className="rotulo" htmlFor="modelo">Começar a partir de um modelo</label>
            <select id="modelo" className="campo" value={modelo} onChange={(e) => escolherModelo(e.target.value)}>
              <option value="">Em branco</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome} ({m.template_items.length} itens)</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="rotulo" htmlFor="titulo">Título</label>
          <input id="titulo" className="campo" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                 placeholder="Ex.: Abertura da loja — segunda" />
        </div>
        <div>
          <label className="rotulo" htmlFor="descricao">Descrição (opcional)</label>
          <textarea id="descricao" className="campo min-h-20" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="prazo">Prazo (opcional)</label>
          <input id="prazo" type="date" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <div>
          <span className="rotulo">Responsáveis</span>
          <SeletorPessoas equipe={equipe} selecionados={responsaveis} aoMudar={setResponsaveis} />
          <p className="mt-1.5 text-xs text-black/50">Colaboradores só veem os checklists em que forem responsáveis (ou itens atribuídos a eles).</p>
        </div>
        {modeloEscolhido ? (
          <Aviso tipo="info">Os {modeloEscolhido.template_items.length} itens do modelo serão copiados. Você pode editá-los depois.</Aviso>
        ) : (
          <div>
            <label className="rotulo" htmlFor="itens">Itens (um por linha)</label>
            <textarea id="itens" className="campo min-h-36 font-mono text-sm" value={itensTexto} onChange={(e) => setItensTexto(e.target.value)}
                      placeholder={"Ligar as luzes\nConferir o caixa\nAbrir as portas"} />
          </div>
        )}
        <Aviso>{erro}</Aviso>
        <div className="flex justify-end gap-2">
          <Link href="/" className="btn-secundario">Cancelar</Link>
          <button className="btn-primario" disabled={salvando}>{salvando ? "Criando…" : "Criar checklist"}</button>
        </div>
      </form>
    </div>
  );
}
