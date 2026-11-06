"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Contact, LayoutDashboard, ClipboardList, History, Users, Wallet } from "lucide-react";
import { IndicadorLink } from "@/components/ui/IndicadorLink";

const ABAS = [
  { href: "/eletricista", rotulo: "Meus horários", curto: "Horários", icone: Clock },
  { href: "/admin", rotulo: "Resumo", curto: "Resumo", icone: LayoutDashboard },
  { href: "/admin/registros", rotulo: "Registros", curto: "Registros", icone: ClipboardList },
  { href: "/admin/historico", rotulo: "Histórico", curto: "Histórico", icone: History },
  { href: "/admin/agenda", rotulo: "Agenda", curto: "Agenda", icone: CalendarDays },
  { href: "/admin/clientes", rotulo: "Clientes", curto: "Clientes", icone: Contact },
  { href: "/admin/gastos", rotulo: "Gastos", curto: "Gastos", icone: Wallet },
  { href: "/admin/colaboradores", rotulo: "Colaboradores", curto: "Equipe", icone: Users },
];

/** Encarregado: a área dele (eletricista), Resumo e Registros (só ver) e a Agenda. */
const ABAS_ENCARREGADO = [
  { href: "/eletricista", rotulo: "Meus horários", curto: "Horários", icone: Clock },
  { href: "/admin", rotulo: "Resumo", curto: "Resumo", icone: LayoutDashboard },
  { href: "/admin/registros", rotulo: "Registros", curto: "Registros", icone: ClipboardList },
  { href: "/admin/agenda", rotulo: "Agenda", curto: "Agenda", icone: CalendarDays },
];

export function AdminNav({ modo = "admin" }: { modo?: "admin" | "encarregado" }) {
  const caminho = usePathname();
  const abas = modo === "admin" ? ABAS : ABAS_ENCARREGADO;
  // No celular as abas rolam para o lado: deixa a aba aberta sempre à vista.
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => {
    lista.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [caminho]);
  return (
    <nav aria-label="Seções do administrador" className="mx-auto max-w-6xl px-2 sm:px-4">
      <ul ref={lista} className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {abas.map(({ href, rotulo, curto, icone: Icone }) => {
          const ativa = href === "/admin" ? caminho === "/admin" : caminho.startsWith(href);
          return (
            <li key={href} className={`${abas.length > 6 ? "min-w-[4.25rem]" : "min-w-0"} flex-1 shrink-0 lg:min-w-0 lg:flex-none`}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-t-xl px-1 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs lg:flex-row lg:gap-2 lg:px-4 lg:py-0 lg:text-sm ${
                  ativa ? "bg-slate-50 text-marca-700" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Icone className="size-5 shrink-0" aria-hidden />
                <span className="flex items-center gap-1 truncate">
                  <span className="lg:hidden">{curto}</span>
                  <span className="hidden lg:inline">{rotulo}</span>
                  <IndicadorLink className="size-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
