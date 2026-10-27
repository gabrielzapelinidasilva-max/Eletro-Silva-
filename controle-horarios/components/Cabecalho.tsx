import { LogOut } from "lucide-react";
import { sair } from "@/app/actions";
import { Logo } from "./Logo";
import type { Perfil } from "@/lib/tipos";

export function Cabecalho({ perfil, children }: { perfil: Perfil; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 print:hidden bg-gradient-to-r from-marca-800 via-marca-600 to-marca-700 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-11 w-auto shrink-0 sm:h-12" />
          <div className="hidden min-w-0 border-l border-white/30 pl-3 sm:block">
            <p className="text-lg font-bold leading-tight">Eletro Silva</p>
            <p className="text-xs font-medium text-marca-100">Controle de Horários</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold leading-tight">{perfil.nome}</p>
            <p className="text-xs text-marca-100">{perfil.funcao === "admin" ? "Administrador" : "Eletricista"}</p>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-sm font-semibold ring-1 ring-inset ring-white/25 hover:bg-white/20 active:bg-white/30"
            >
              <LogOut className="size-5" aria-hidden />
              Sair
            </button>
          </form>
        </div>
      </div>
      {children}
    </header>
  );
}
