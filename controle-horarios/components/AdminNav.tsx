"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, History, Users } from "lucide-react";
import { IndicadorLink } from "@/components/ui/IndicadorLink";

const ABAS = [
  { href: "/admin", rotulo: "Resumo", icone: LayoutDashboard },
  { href: "/admin/registros", rotulo: "Registros", icone: ClipboardList },
  { href: "/admin/historico", rotulo: "Histórico", icone: History },
  { href: "/admin/colaboradores", rotulo: "Colaboradores", icone: Users },
];

export function AdminNav() {
  const caminho = usePathname();
  return (
    <nav aria-label="Seções do administrador" className="mx-auto max-w-6xl px-2 sm:px-4">
      <ul className="flex gap-1">
        {ABAS.map(({ href, rotulo, icone: Icone }) => {
          const ativa = href === "/admin" ? caminho === "/admin" : caminho.startsWith(href);
          return (
            <li key={href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-t-xl px-1 py-1.5 text-[11px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-5 sm:py-0 sm:text-sm ${
                  ativa ? "bg-slate-50 text-marca-700" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Icone className="size-5 shrink-0" aria-hidden />
                <span className="flex items-center gap-1 truncate">{rotulo} <IndicadorLink className="size-3.5" /></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
