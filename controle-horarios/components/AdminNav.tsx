"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users } from "lucide-react";

const ABAS = [
  { href: "/admin", rotulo: "Resumo", icone: LayoutDashboard },
  { href: "/admin/registros", rotulo: "Registros", icone: ClipboardList },
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
                className={`flex min-h-12 items-center justify-center gap-2 rounded-t-xl px-3 text-sm font-semibold transition-colors sm:px-5 ${
                  ativa ? "bg-slate-50 text-marca-700" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Icone className="size-5 shrink-0" aria-hidden />
                <span className="truncate">{rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
