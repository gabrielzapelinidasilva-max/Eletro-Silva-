import Link from "next/link";
import { Download, Filter, Search, X } from "lucide-react";
import { Campo, Selecao } from "@/components/ui/Campo";
import { classesBotao } from "@/components/ui/estilos";
import { filtrosParaURL, type Filtros as TFiltros } from "@/lib/consultas";
import type { Perfil } from "@/lib/tipos";

/** Filtros enviados pela URL (GET): funcionam sem JavaScript e podem ser salvos nos favoritos. */
export function Filtros({ filtros, colaboradores }: { filtros: TFiltros; colaboradores: Pick<Perfil, "id" | "nome" | "ativo">[] }) {
  return (
    <form method="get" className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <div className="sm:col-span-2 lg:col-span-6">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtros.q}
            placeholder="Buscar em cliente, serviço e observações..."
            className="block w-full rounded-xl border-0 bg-white py-3 pl-11 pr-3.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-marca-600"
          />
        </div>
      </div>
      <div className="lg:col-span-2">
        <Selecao rotulo="Colaborador" name="colaborador" defaultValue={filtros.colaborador}>
          <option value="">Todos</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.ativo ? "" : " (inativo)"}
            </option>
          ))}
        </Selecao>
      </div>
      <Campo rotulo="Data inicial" name="de" type="date" defaultValue={filtros.de} />
      <Campo rotulo="Data final" name="ate" type="date" defaultValue={filtros.ate} />
      <div className="sm:col-span-2 lg:col-span-2">
        <Campo rotulo="Cliente" name="cliente" defaultValue={filtros.cliente} placeholder="Nome do cliente" />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
        <button type="submit" className={classesBotao("primario", "md", "flex-1 sm:flex-none")}>
          <Filter className="size-4" aria-hidden /> Filtrar
        </button>
        <Link href="/admin/registros" className={classesBotao("fantasma", "md")}>
          <X className="size-4" aria-hidden /> Limpar
        </Link>
        <a href={`/admin/registros/exportar?${filtrosParaURL(filtros)}`} className={classesBotao("secundario", "md", "sm:ml-auto")} download>
          <Download className="size-4" aria-hidden /> Exportar CSV/Excel
        </a>
      </div>
    </form>
  );
}
