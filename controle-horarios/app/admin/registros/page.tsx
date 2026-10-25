import type { Metadata } from "next";
import { Filtros } from "./Filtros";
import { TabelaRegistros } from "./TabelaRegistros";
import { Cartao, Indicador, TituloSecao } from "@/components/ui/Cartao";
import { EstadoVazio } from "@/components/ui/Estados";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarRegistros, lerFiltros, totaisPorColaborador } from "@/lib/consultas";
import { formatarData } from "@/lib/datas";
import { formatarMinutos, somarMinutos } from "@/lib/horas";
import type { Perfil } from "@/lib/tipos";

export const metadata: Metadata = { title: "Registros" };

const MOSTRAR_NA_TELA = 300;

export default async function PaginaRegistros({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdmin();
  const filtros = lerFiltros(await searchParams);
  const supabase = await criarClienteServidor();

  const [registros, { data: pessoas }] = await Promise.all([
    buscarRegistros(supabase, filtros),
    supabase.from("profiles").select("id, nome, ativo").order("nome"),
  ]);
  const totais = totaisPorColaborador(registros);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Registros</h1>
        <p className="text-slate-500">
          Período de {formatarData(filtros.de)} a {formatarData(filtros.ate)}.
        </p>
      </div>

      <Filtros filtros={filtros} colaboradores={(pessoas ?? []) as Pick<Perfil, "id" | "nome" | "ativo">[]} />

      <section aria-label="Totais do período" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Indicador rotulo="Total de horas" valor={formatarMinutos(somarMinutos(registros))} destaque />
        <Indicador rotulo="Registros" valor={String(registros.length)} />
        <Indicador rotulo="Colaboradores" valor={String(totais.length)} />
      </section>

      {registros.length === 0 ? (
        <EstadoVazio titulo="Nenhum registro encontrado" texto="Tente mudar o período ou limpar os filtros." />
      ) : (
        <>
          <Cartao>
            <TituloSecao>Horas por colaborador</TituloSecao>
            <ul className="divide-y divide-slate-100">
              {totais.map((t) => (
                <li key={t.usuario_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.nome}</p>
                    <p className="text-xs text-slate-500">
                      {t.registros} {t.registros === 1 ? "registro" : "registros"}
                      {t.emAberto > 0 && ` · ${t.emAberto} em andamento`}
                    </p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-marca-700">{formatarMinutos(t.minutos)}</p>
                </li>
              ))}
            </ul>
          </Cartao>

          <section>
            <TituloSecao>Lista de registros</TituloSecao>
            {registros.length > MOSTRAR_NA_TELA && (
              <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                Mostrando os {MOSTRAR_NA_TELA} mais recentes de {registros.length}. Os totais consideram todos. Use os filtros ou exporte para ver tudo.
              </p>
            )}
            <TabelaRegistros registros={registros.slice(0, MOSTRAR_NA_TELA)} />
          </section>
        </>
      )}
    </div>
  );
}
