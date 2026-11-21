"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutTemplate, LogOut, Package, Users } from "lucide-react";
import { Logo } from "./Logo";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { cx } from "@/lib/utils";

export function Cabecalho({ nome, admin }: { nome: string; admin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", rotulo: "Checklists", icone: ClipboardList, ativo: pathname === "/" || pathname.startsWith("/checklists") },
    { href: "/equipamentos", rotulo: "Equipamentos", icone: Package, ativo: pathname.startsWith("/equipamentos") },
    ...(admin
      ? [
          { href: "/admin/modelos", rotulo: "Modelos", icone: LayoutTemplate, ativo: pathname.startsWith("/admin/modelos") },
          { href: "/admin/usuarios", rotulo: "Usuários", icone: Users, ativo: pathname.startsWith("/admin/usuarios") },
        ]
      : []),
  ];

  async function sair() {
    await criarClienteNavegador().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Início">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cx("btn min-h-10", l.ativo ? "bg-primaria-clara text-primaria" : "text-black/65 hover:bg-black/5")}
              >
                <l.icone className="h-4 w-4" />
                {l.rotulo}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[10rem] truncate text-sm text-black/60 md:block">{nome}</span>
            <button onClick={sair} className="btn-fantasma min-h-10 px-3" title="Sair">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegação inferior no celular */}
      {links.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
             style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx("flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium", l.ativo ? "text-primaria" : "text-black/55")}
            >
              <l.icone className="h-5 w-5" />
              {l.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
