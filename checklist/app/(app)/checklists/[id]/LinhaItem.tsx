"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Check, GripVertical, MessageSquare, Pencil, Trash2, User } from "lucide-react";
import type { Item, PerfilResumo } from "@/lib/tipos";
import { cx, formatarData, formatarDataHora, vencido } from "@/lib/utils";

export function LinhaItem({
  item, admin, equipe, nomeDe, aoAlternar, aoComentar, aoEditar, aoExcluir,
}: {
  item: Item;
  admin: boolean;
  equipe: PerfilResumo[];
  nomeDe: (id: string | null) => string;
  aoAlternar: () => void;
  aoComentar: (t: string) => Promise<void>;
  aoEditar: (d: Partial<Item>) => Promise<void>;
  aoExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !admin,
  });
  const [comentando, setComentando] = useState(false);
  const [comentario, setComentario] = useState(item.comentario ?? "");
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.texto);
  const [responsavel, setResponsavel] = useState(item.responsavel_id ?? "");
  const [prazo, setPrazo] = useState(item.prazo ?? "");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx("cartao p-3", isDragging && "relative z-10 shadow-lg ring-2 ring-primaria/30", item.concluido && "bg-white/70")}
    >
      <div className="flex items-start gap-2">
        {admin && (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="mt-1 -ml-1 flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-black/30 active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={aoAlternar}
          role="checkbox"
          aria-checked={item.concluido}
          aria-label={item.concluido ? `Desmarcar ${item.texto}` : `Marcar ${item.texto}`}
          className={cx(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition",
            item.concluido ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 bg-white hover:border-primaria",
          )}
        >
          {item.concluido && <Check className="h-5 w-5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1 pt-1">
          {editando ? (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!texto.trim()) return;
                await aoEditar({ texto: texto.trim(), responsavel_id: responsavel || null, prazo: prazo || null });
                setEditando(false);
              }}
            >
              <input className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto do item" autoFocus />
              <div className="grid gap-2 sm:grid-cols-2">
                <select className="campo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} aria-label="Responsável">
                  <option value="">Sem responsável</option>
                  {equipe.filter((p) => p.ativo || p.id === item.responsavel_id).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <input type="date" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} aria-label="Prazo" />
              </div>
              <div className="flex gap-2">
                <button className="btn-primario min-h-9">Salvar</button>
                <button type="button" className="btn-secundario min-h-9" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <p className={cx("break-words leading-snug", item.concluido && "text-black/45 line-through")}>{item.texto}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/50">
                {item.responsavel_id && (
                  <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {nomeDe(item.responsavel_id)}</span>
                )}
                {item.prazo && (
                  <span className={cx("inline-flex items-center gap-1", vencido(item.prazo, item.concluido) && "font-semibold text-red-600")}>
                    <CalendarDays className="h-3.5 w-3.5" /> {formatarData(item.prazo)}
                  </span>
                )}
                {item.concluido && item.concluido_em && (
                  <span className="text-emerald-700">
                    ✓ {item.concluido_por ? nomeDe(item.concluido_por) : "Concluído"} · {formatarDataHora(item.concluido_em)}
                  </span>
                )}
              </div>
              {item.comentario && !comentando && (
                <p className="mt-2 whitespace-pre-line rounded-lg bg-bege-claro px-3 py-2 text-sm text-black/70">{item.comentario}</p>
              )}
            </>
          )}

          {comentando && (
            <form
              className="mt-2 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await aoComentar(comentario);
                setComentando(false);
              }}
            >
              <textarea className="campo min-h-20" value={comentario} onChange={(e) => setComentario(e.target.value)}
                        placeholder="Observação sobre este item…" aria-label="Comentário" autoFocus />
              <div className="flex gap-2">
                <button className="btn-primario min-h-9">Salvar</button>
                <button type="button" className="btn-secundario min-h-9" onClick={() => { setComentando(false); setComentario(item.comentario ?? ""); }}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {!editando && !comentando && (
          <div className="flex shrink-0 items-center">
            <button className="btn-fantasma min-h-9 px-2" onClick={() => { setComentario(item.comentario ?? ""); setComentando(true); }}
                    aria-label="Comentar" title="Comentar">
              <MessageSquare className={cx("h-4 w-4", item.comentario && "fill-primaria/15 text-primaria")} />
            </button>
            {admin && (
              <>
                <button className="btn-fantasma min-h-9 px-2" aria-label="Editar item" title="Editar"
                        onClick={() => { setTexto(item.texto); setResponsavel(item.responsavel_id ?? ""); setPrazo(item.prazo ?? ""); setEditando(true); }}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn-fantasma min-h-9 px-2 text-red-600" onClick={aoExcluir} aria-label="Excluir item" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
