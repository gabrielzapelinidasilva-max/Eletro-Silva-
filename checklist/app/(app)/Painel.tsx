"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Search } from "lucide-react";
import { Avatar, BarraProgresso, Vazio } from "@/components/ui";
import { useEquipe } from "@/lib/hooks/useEquipe";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { cx, formatarData, vencido } from "@/lib/utils";

type Linha = {
  id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  arquivado: boolean;
  updated_at: string;
  checklist_items: { concluido: boolean }[];
  checklist_members: { user_id: string }[];
};

type Filtro = "andamento" | "concluido" | "arquivado" | "todos";

function statusDe(c: Linha): Exclude<Filtro, "todos"> {
  if (c.arquivado) return "arquivado";
  const total = c.checklist_items.length;
  const feitos = c.checklist_items.filter((i) => i.concluido).length;
  return total > 0 && feitos === total ? "concluido" : "andamento";
}

export function Painel({ admin, nome }: { admin: boolean; meuId: string; nome: string }) {
  const supabase = useMemo(() => criarClienteNavegador(), []);
  const { nomeDe } = useEquipe();
  const [lista, setLista] = useState<Linha[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("andamento");
  const [busca, setBusca] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("checklists")
      .select("id, titulo, descricao, prazo, arquivado, updated_at, checklist_items(concluido), checklist_members(user_id)")
      .order("updated_at", { ascending: false });
    setLista((data as Linha[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    carregar();
    const recarregar = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(carregar, 300);
    };
    const canal = supabase
      .channel("painel")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklists" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_members" }, recarregar)
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(canal);
    };
  }, [supabase, carregar]);

  const contagem = useMemo(() => {
    const c = { andamento: 0, concluido: 0, arquivado: 0, todos: 0 };
    (lista ?? []).forEach((l) => {
      c[statusDe(l)]++;
      if (!l.arquivado) c.todos++;
    });
    return c;
  }, [lista]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista ?? []).filter((l) => {
      const st = statusDe(l);
      if (filtro === "todos" ? st === "arquivado" : st !== filtro) return false;
      if (!termo) return true;
      return l.titulo.toLowerCase().includes(termo) || (l.descricao ?? "").toLowerCase().includes(termo);
    });
  }, [lista, filtro, busca]);

  const abas: { id: Filtro; rotulo: string }[] = [
    { id: "andamento", rotulo: "Em andamento" },
    { id: "concluido", rotulo: "Concluídos" },
    ...(admin ? [{ id: "arquivado" as Filtro, rotulo: "Arquivados" }] : []),
    { id: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-black/55">Olá, {nome.split(" ")[0]}</p>
          <h1 className="text-2xl font-bold tracking-tight">{admin ? "Checklists" : "Meus checklists"}</h1>
        </div>
        {admin && (
          <Link href="/admin/checklists/novo" className="btn-primario">
            <Plus className="h-4 w-4" /> Novo checklist
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <span className="sr-only">Buscar</span>
          <input
            className="campo pl-10"
            placeholder="Buscar checklist…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="search"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setFiltro(a.id)}
              className={cx(
                "btn min-h-9 shrink-0 rounded-full px-3.5",
                filtro === a.id ? "bg-tinta text-white" : "border border-black/10 bg-white text-black/70",
              )}
            >
              {a.rotulo}
              <span className={cx("rounded-full px-1.5 text-xs", filtro === a.id ? "bg-white/20" : "bg-bege/60")}>
                {contagem[a.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lista === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="cartao h-32 animate-pulse bg-white/60" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <Vazio titulo={busca ? "Nada encontrado" : "Nenhum checklist aqui"}>
          {busca
            ? "Tente outra palavra."
            : admin
              ? "Crie um checklist ou mude o filtro."
              : "Quando um checklist for atribuído a você, ele aparece aqui."}
        </Vazio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((c) => {
            const total = c.checklist_items.length;
            const feitos = c.checklist_items.filter((i) => i.concluido).length;
            const st = statusDe(c);
            return (
              <li key={c.id}>
                <Link href={`/checklists/${c.id}`} className="cartao block p-4 transition hover:border-primaria/30 hover:shadow-md">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <h2 className="font-semibold leading-snug">{c.titulo}</h2>
                    {st === "concluido" && <span className="chip shrink-0 bg-emerald-50 text-emerald-700">Concluído</span>}
                    {st === "arquivado" && <span className="chip shrink-0 bg-black/5 text-black/60">Arquivado</span>}
                  </div>
                  {c.descricao && <p className="mb-3 line-clamp-2 text-sm text-black/55">{c.descricao}</p>}
                  <BarraProgresso feitos={feitos} total={total} />
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-black/55">
                    <span>
                      {feitos} de {total} {total === 1 ? "item" : "itens"}
                    </span>
                    <div className="flex items-center gap-3">
                      {c.prazo && (
                        <span className={cx("inline-flex items-center gap-1", vencido(c.prazo, st !== "andamento") && "font-semibold text-red-600")}>
                          <CalendarDays className="h-3.5 w-3.5" /> {formatarData(c.prazo)}
                        </span>
                      )}
                      <span className="flex -space-x-1.5">
                        {c.checklist_members.slice(0, 4).map((m) => (
                          <Avatar key={m.user_id} nome={nomeDe(m.user_id)} pequeno />
                        ))}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
