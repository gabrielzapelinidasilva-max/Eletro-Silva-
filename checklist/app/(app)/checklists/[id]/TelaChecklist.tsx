"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Archive, ArchiveRestore, ArrowLeft, CalendarDays, History, LayoutTemplate, Pencil, Plus, Trash2, Users,
} from "lucide-react";
import { Avatar, Aviso, BarraProgresso, Modal, Vazio } from "@/components/ui";
import { SeletorPessoas } from "@/components/SeletorPessoas";
import { useEquipe } from "@/lib/hooks/useEquipe";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { Atividade, Checklist, Item } from "@/lib/tipos";
import { cx, formatarData, formatarDataHora, mensagemErro, vencido } from "@/lib/utils";
import { LinhaItem } from "./LinhaItem";

const ordenar = (a: Item, b: Item) => a.posicao - b.posicao || a.created_at.localeCompare(b.created_at);

export function TelaChecklist({ id, admin, meuId }: { id: string; admin: boolean; meuId: string }) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const router = useRouter();
  const { equipe, nomeDe } = useEquipe();

  const [checklist, setChecklist] = useState<Checklist | null | undefined>(undefined);
  const [membros, setMembros] = useState<string[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [historico, setHistorico] = useState<Atividade[]>([]);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState<"editar" | "modelo" | "excluir" | null>(null);
  const [verHistorico, setVerHistorico] = useState(false);
  const arrastando = useRef(false);

  const carregarItens = useCallback(async () => {
    const { data } = await supabase.from("checklist_items").select("*").eq("checklist_id", id);
    if (!arrastando.current) setItens(((data as Item[]) ?? []).sort(ordenar));
  }, [supabase, id]);

  const carregarCabecalho = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("checklists").select("*").eq("id", id).maybeSingle(),
      supabase.from("checklist_members").select("user_id").eq("checklist_id", id),
    ]);
    setChecklist((c as Checklist) ?? null);
    setMembros((m ?? []).map((x: { user_id: string }) => x.user_id));
  }, [supabase, id]);

  const carregarHistorico = useCallback(async () => {
    const { data } = await supabase
      .from("activity_log").select("*").eq("checklist_id", id)
      .order("created_at", { ascending: false }).limit(100);
    setHistorico((data as Atividade[]) ?? []);
  }, [supabase, id]);

  useEffect(() => {
    carregarCabecalho();
    carregarItens();
    carregarHistorico();
    const filtro = `checklist_id=eq.${id}`;
    const canal = supabase
      .channel(`checklist-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items", filter: filtro }, (p) => {
        if (arrastando.current) return;
        if (p.eventType === "DELETE") {
          setItens((l) => l.filter((i) => i.id !== (p.old as Item).id));
        } else {
          const novo = p.new as Item;
          setItens((l) => [...l.filter((i) => i.id !== novo.id), novo].sort(ordenar));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log", filter: filtro }, (p) =>
        setHistorico((h) => [p.new as Atividade, ...h.filter((x) => x.id !== (p.new as Atividade).id)]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists", filter: `id=eq.${id}` }, carregarCabecalho)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_members", filter: filtro }, carregarCabecalho)
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, id, carregarCabecalho, carregarItens, carregarHistorico]);

  // ---- Ações nos itens ----------------------------------------------
  async function alternar(item: Item) {
    const concluido = !item.concluido;
    setItens((l) =>
      l.map((i) => (i.id === item.id ? { ...i, concluido, concluido_por: concluido ? meuId : null, concluido_em: concluido ? new Date().toISOString() : null } : i)),
    );
    const { data, error } = await supabase.from("checklist_items").update({ concluido }).eq("id", item.id).select().maybeSingle();
    if (error || !data) {
      setErro(error ? mensagemErro(error) : "Não foi possível atualizar o item.");
      carregarItens();
    } else {
      setItens((l) => l.map((i) => (i.id === item.id ? (data as Item) : i)));
    }
  }

  async function comentar(item: Item, comentario: string) {
    const { error } = await supabase.from("checklist_items").update({ comentario: comentario.trim() || null }).eq("id", item.id);
    if (error) setErro(mensagemErro(error));
    else setItens((l) => l.map((i) => (i.id === item.id ? { ...i, comentario: comentario.trim() || null } : i)));
  }

  async function editarItem(item: Item, dados: Partial<Item>) {
    const { error } = await supabase.from("checklist_items").update(dados).eq("id", item.id);
    if (error) return setErro(mensagemErro(error));
    setItens((l) => l.map((i) => (i.id === item.id ? { ...i, ...dados } : i)));
  }

  async function excluirItem(item: Item) {
    if (!confirm(`Excluir o item "${item.texto}"?`)) return;
    const { error } = await supabase.from("checklist_items").delete().eq("id", item.id);
    if (error) return setErro(mensagemErro(error));
    setItens((l) => l.filter((i) => i.id !== item.id));
  }

  // ---- Reordenar (arrastar e soltar) --------------------------------
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function aoSoltar(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = itens.findIndex((i) => i.id === active.id);
    const para = itens.findIndex((i) => i.id === over.id);
    const nova = arrayMove(itens, de, para).map((i, idx) => ({ ...i, posicao: idx + 1 }));
    setItens(nova);
    arrastando.current = true;
    const { error } = await supabase.rpc("reordenar_itens", { p_checklist: id, p_ids: nova.map((i) => i.id) });
    arrastando.current = false;
    if (error) {
      setErro(mensagemErro(error));
      carregarItens();
    }
  }

  // ---- Ações do checklist -------------------------------------------
  async function arquivar(valor: boolean) {
    const { error } = await supabase.from("checklists").update({ arquivado: valor }).eq("id", id);
    if (error) setErro(mensagemErro(error));
    else carregarCabecalho();
  }

  if (checklist === undefined) {
    return <div className="cartao h-48 animate-pulse bg-white/60" />;
  }
  if (checklist === null) {
    return (
      <Vazio titulo="Checklist não encontrado">
        Ele pode ter sido excluído, arquivado ou não estar atribuído a você.{" "}
        <Link href="/" className="font-medium text-primaria">Voltar</Link>
      </Vazio>
    );
  }

  const feitos = itens.filter((i) => i.concluido).length;

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-black/55 hover:text-tinta">
        <ArrowLeft className="h-4 w-4" /> Checklists
      </Link>

      <section className="cartao space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{checklist.titulo}</h1>
              {checklist.arquivado && <span className="chip bg-black/5 text-black/60">Arquivado</span>}
            </div>
            {checklist.descricao && <p className="mt-1 whitespace-pre-line text-black/60">{checklist.descricao}</p>}
          </div>
          {admin && (
            <div className="flex flex-wrap gap-1">
              <button className="btn-secundario min-h-10 px-3" onClick={() => setModal("editar")} title="Editar">
                <Pencil className="h-4 w-4" /> <span className="sm:hidden lg:inline">Editar</span>
              </button>
              <button className="btn-secundario min-h-10 px-3" onClick={() => setModal("modelo")} title="Salvar como modelo">
                <LayoutTemplate className="h-4 w-4" />
              </button>
              <button className="btn-secundario min-h-10 px-3" onClick={() => arquivar(!checklist.arquivado)}
                      title={checklist.arquivado ? "Desarquivar" : "Arquivar"}>
                {checklist.arquivado ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button className="btn-secundario min-h-10 px-3 text-red-600" onClick={() => setModal("excluir")} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/60">
          {checklist.prazo && (
            <span className={cx("inline-flex items-center gap-1.5", vencido(checklist.prazo, feitos === itens.length && itens.length > 0) && "font-semibold text-red-600")}>
              <CalendarDays className="h-4 w-4" /> Prazo: {formatarData(checklist.prazo)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {membros.length === 0 ? "Sem responsáveis" : membros.map((m) => nomeDe(m)).join(", ")}
          </span>
        </div>

        <BarraProgresso feitos={feitos} total={itens.length} />
        <p className="-mt-2 text-xs text-black/50">{feitos} de {itens.length} concluídos</p>
      </section>

      <Aviso>{erro && <span className="flex justify-between gap-3">{erro}<button onClick={() => setErro("")} className="font-semibold">OK</button></span>}</Aviso>

      <section className="space-y-2">
        {itens.length === 0 && <Vazio titulo="Nenhum item ainda">{admin ? "Adicione o primeiro item abaixo." : ""}</Vazio>}
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {itens.map((item) => (
                <LinhaItem
                  key={item.id}
                  item={item}
                  admin={admin}
                  equipe={equipe}
                  nomeDe={nomeDe}
                  aoAlternar={() => alternar(item)}
                  aoComentar={(t) => comentar(item, t)}
                  aoEditar={(d) => editarItem(item, d)}
                  aoExcluir={() => excluirItem(item)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {admin && <NovoItem checklistId={id} proximaPosicao={(itens.at(-1)?.posicao ?? 0) + 1} equipe={equipe}
                           aoCriar={(i) => setItens((l) => [...l.filter((x) => x.id !== i.id), i].sort(ordenar))} aoErro={setErro} />}
      </section>

      <section className="cartao p-4">
        <button className="flex w-full items-center justify-between gap-2 font-semibold" onClick={() => setVerHistorico((v) => !v)}
                aria-expanded={verHistorico}>
          <span className="inline-flex items-center gap-2"><History className="h-4 w-4" /> Histórico</span>
          <span className="text-sm font-normal text-black/50">{verHistorico ? "Ocultar" : `${historico.length} registros`}</span>
        </button>
        {verHistorico && (
          <ul className="mt-3 space-y-3 border-t border-black/5 pt-3">
            {historico.length === 0 && <li className="text-sm text-black/50">Nada registrado ainda.</li>}
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <Avatar nome={nomeDe(h.user_id)} pequeno />
                <div className="min-w-0">
                  <p>
                    <strong>{nomeDe(h.user_id)}</strong>{" "}
                    <span className={cx(h.acao === "marcou" && "text-emerald-700", h.acao === "desmarcou" && "text-amber-700")}>{h.acao}</span>{" "}
                    <span className="break-words text-black/70">{h.detalhe}</span>
                  </p>
                  <p className="text-xs text-black/45">{formatarDataHora(h.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin && (
        <>
          <ModalEditar aberto={modal === "editar"} aoFechar={() => setModal(null)} checklist={checklist} membros={membros}
                       equipe={equipe} aoSalvar={carregarCabecalho} />
          <ModalModelo aberto={modal === "modelo"} aoFechar={() => setModal(null)} checklistId={id} tituloPadrao={checklist.titulo} />
          <Modal aberto={modal === "excluir"} aoFechar={() => setModal(null)} titulo="Excluir checklist">
            <p className="mb-5 text-black/70">
              Isso apaga <strong>{checklist.titulo}</strong>, todos os itens e o histórico. Não dá para desfazer.
              Se quiser só tirar da lista, use <strong>Arquivar</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secundario" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-perigo" onClick={async () => {
                const { error } = await supabase.from("checklists").delete().eq("id", id);
                if (error) return setErro(mensagemErro(error));
                router.replace("/");
                router.refresh();
              }}>Excluir de vez</button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function NovoItem({ checklistId, proximaPosicao, equipe, aoCriar, aoErro }: {
  checklistId: string; proximaPosicao: number; equipe: ReturnType<typeof useEquipe>["equipe"];
  aoCriar: (i: Item) => void; aoErro: (m: string) => void;
}) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [texto, setTexto] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSalvando(true);
    const { data, error } = await supabase.from("checklist_items").insert({
      checklist_id: checklistId, texto: texto.trim(), posicao: proximaPosicao,
      responsavel_id: responsavel || null, prazo: prazo || null,
    }).select().single();
    setSalvando(false);
    if (error) return aoErro(mensagemErro(error));
    aoCriar(data as Item);
    setTexto("");
  }

  return (
    <form onSubmit={adicionar} className="cartao space-y-3 border-dashed p-3">
      <div className="flex gap-2">
        <input className="campo" placeholder="Novo item…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto do novo item" />
        <button className="btn-primario shrink-0 px-3" disabled={salvando || !texto.trim()} aria-label="Adicionar item">
          <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>
      {mais ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="campo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Responsável">
            <option value="">Sem responsável</option>
            {equipe.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <input type="date" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo do item" />
        </div>
      ) : (
        <button type="button" className="text-sm font-medium text-primaria" onClick={() => setMais(true)}>+ Responsável e prazo</button>
      )}
    </form>
  );
}

function ModalEditar({ aberto, aoFechar, checklist, membros, equipe, aoSalvar }: {
  aberto: boolean; aoFechar: () => void; checklist: Checklist; membros: string[];
  equipe: ReturnType<typeof useEquipe>["equipe"]; aoSalvar: () => void;
}) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [titulo, setTitulo] = useState(checklist.titulo);
  const [descricao, setDescricao] = useState(checklist.descricao ?? "");
  const [prazo, setPrazo] = useState(checklist.prazo ?? "");
  const [sel, setSel] = useState<string[]>(membros);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Preenche só quando o formulário abre (atualizações em tempo real não apagam o que está sendo editado)
  const atual = useRef({ checklist, membros });
  atual.current = { checklist, membros };
  useEffect(() => {
    if (aberto) {
      const { checklist: c, membros: m } = atual.current;
      setTitulo(c.titulo); setDescricao(c.descricao ?? ""); setPrazo(c.prazo ?? ""); setSel(m); setErro("");
    }
  }, [aberto]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from("checklists")
      .update({ titulo: titulo.trim(), descricao: descricao.trim() || null, prazo: prazo || null }).eq("id", checklist.id);
    if (error) { setSalvando(false); return setErro(mensagemErro(error)); }
    const sair = membros.filter((m) => !sel.includes(m));
    const entrar = sel.filter((m) => !membros.includes(m));
    if (sair.length) await supabase.from("checklist_members").delete().eq("checklist_id", checklist.id).in("user_id", sair);
    if (entrar.length) {
      const { error: e2 } = await supabase.from("checklist_members").insert(entrar.map((user_id) => ({ checklist_id: checklist.id, user_id })));
      if (e2) { setSalvando(false); return setErro(mensagemErro(e2)); }
    }
    setSalvando(false);
    aoSalvar();
    aoFechar();
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Editar checklist">
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="ed-titulo">Título</label>
          <input id="ed-titulo" className="campo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="ed-desc">Descrição</label>
          <textarea id="ed-desc" className="campo min-h-20" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="ed-prazo">Prazo (opcional)</label>
          <input id="ed-prazo" type="date" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>
        <div>
          <span className="rotulo">Responsáveis</span>
          <SeletorPessoas equipe={equipe} selecionados={sel} aoMudar={setSel} />
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

function ModalModelo({ aberto, aoFechar, checklistId, tituloPadrao }: {
  aberto: boolean; aoFechar: () => void; checklistId: string; tituloPadrao: string;
}) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const [nome, setNome] = useState(tituloPadrao);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  useEffect(() => { if (aberto) { setNome(tituloPadrao); setMsg(null); } }, [aberto, tituloPadrao]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.rpc("salvar_como_modelo", { p_checklist: checklistId, p_nome: nome });
    setMsg(error ? { tipo: "erro", texto: mensagemErro(error) } : { tipo: "ok", texto: "Modelo salvo! Use em Modelos → Usar." });
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Salvar como modelo">
      <form onSubmit={salvar} className="space-y-4">
        <p className="text-sm text-black/60">Os itens deste checklist viram um modelo para criar novos checklists iguais.</p>
        <div>
          <label className="rotulo" htmlFor="mod-nome">Nome do modelo</label>
          <input id="mod-nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secundario" onClick={aoFechar}>Fechar</button>
          {msg?.tipo !== "ok" && <button className="btn-primario">Salvar modelo</button>}
        </div>
      </form>
    </Modal>
  );
}
