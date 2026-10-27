import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Clock, Download, Search, User, Users, X } from "lucide-react";
import { Cartao, Indicador } from "@/components/ui/Cartao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarRegistros, filtrosParaURL, INICIO_HISTORICO, lerFiltros, totaisPorCliente, type Filtros } from "@/lib/consultas";
import { dataPorExtenso, formatarData, formatarHora, hojeSP } from "@/lib/datas";
import { formatarMinutos, somarMinutos } from "@/lib/horas";
import { formatarMoeda, formatarNumero } from "@/lib/gastos";
import { Anexos } from "@/components/registros/Anexos";
import type { Perfil, RegistroComPerfil } from "@/lib/tipos";

export const metadata: Metadata = { title: "Histórico" };

const POR_PAGINA = 50;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type Parametros = Record<string, string | string[] | undefined>;
type Visao = "data" | "clientes";

function nomeDoMes(iso: string) {
  const mes = MESES[Number(iso.slice(5, 7)) - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} de ${iso.slice(0, 4)}`;
}

/** Monta a URL do histórico mantendo os filtros e trocando só o que for passado. */
function urlHistorico(f: Filtros, extra: Record<string, string | number | undefined>) {
  // Período padrão (todo o histórico até hoje) não vai para a URL.
  const p = new URLSearchParams(filtrosParaURL({ ...f, de: f.de === INICIO_HISTORICO ? "" : f.de, ate: f.ate === hojeSP() ? "" : f.ate }));
  Object.entries(extra).forEach(([k, v]) => (v === undefined || v === "" ? p.delete(k) : p.set(k, String(v))));
  const q = p.toString();
  return `/admin/historico${q ? `?${q}` : ""}`;
}

export default async function PaginaHistorico({ searchParams }: { searchParams: Promise<Parametros> }) {
  await exigirAdmin();
  const params = await searchParams;
  const filtros = lerFiltros(params, { todoPeriodo: true });
  const visao: Visao = params.ver === "clientes" ? "clientes" : "data";
  const supabase = await criarClienteServidor();

  const [registros, { data: pessoas }] = await Promise.all([
    buscarRegistros(supabase, filtros),
    supabase.from("profiles").select("id, nome, ativo").order("nome"),
  ]);

  const clientes = totaisPorCliente(registros);
  const maisAntigo = registros.length ? registros[registros.length - 1].data : null;
  const temFiltro = Boolean(filtros.q || filtros.colaborador || filtros.cliente || filtros.de !== INICIO_HISTORICO || filtros.ate !== hojeSP());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Histórico de trabalhos</h1>
        <p className="text-slate-500">
          {maisAntigo ? `Todos os serviços registrados desde ${formatarData(maisAntigo)}.` : "Todos os serviços registrados pela equipe."}
        </p>
      </div>

      <FiltrosHistorico filtros={filtros} visao={visao} colaboradores={(pessoas ?? []) as Pick<Perfil, "id" | "nome" | "ativo">[]} temFiltro={temFiltro} />

      <section aria-label="Totais do histórico" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Trabalhos" valor={String(registros.length)} destaque />
        <Indicador rotulo="Horas trabalhadas" valor={formatarMinutos(somarMinutos(registros))} />
        <Indicador rotulo="Clientes atendidos" valor={String(clientes.length)} />
        <Indicador rotulo="Colaboradores" valor={String(new Set(registros.map((r) => r.usuario_id)).size)} />
      </section>

      <div className="flex gap-2" role="tablist" aria-label="Forma de ver o histórico">
        {(["data", "clientes"] as const).map((v) => (
          <Link
            key={v}
            role="tab"
            aria-selected={visao === v}
            href={urlHistorico(filtros, { ver: v === "data" ? undefined : v, pagina: undefined })}
            className={classesBotao(visao === v ? "primario" : "secundario", "md", "flex-1 sm:flex-none")}
          >
            {v === "data" ? <><CalendarDays className="size-4" aria-hidden /> Por data</> : <><Users className="size-4" aria-hidden /> Por cliente</>}
            <IndicadorLink />
          </Link>
        ))}
      </div>

      {registros.length === 0 ? (
        <EstadoVazio
          titulo={temFiltro ? "Nenhum trabalho encontrado" : "Nenhum trabalho registrado ainda"}
          texto={temFiltro ? "Tente outra busca ou limpe os filtros." : "Quando os eletricistas registrarem os atendimentos, eles aparecem aqui."}
        />
      ) : visao === "clientes" ? (
        <ListaClientes clientes={clientes} filtros={filtros} params={params} />
      ) : (
        <LinhaDoTempo registros={registros} filtros={filtros} pagina={Number(params.pagina) || 1} />
      )}
    </div>
  );
}

function FiltrosHistorico({ filtros, visao, colaboradores, temFiltro }: {
  filtros: Filtros; visao: Visao; colaboradores: Pick<Perfil, "id" | "nome" | "ativo">[]; temFiltro: boolean;
}) {
  return (
    <form method="get" className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      {visao === "clientes" && <input type="hidden" name="ver" value="clientes" />}
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
            <option key={c.id} value={c.id}>{c.nome}{c.ativo ? "" : " (inativo)"}</option>
          ))}
        </Selecao>
      </div>
      <div className="lg:col-span-2">
        <Campo rotulo="Cliente" name="cliente" defaultValue={filtros.cliente} placeholder="Nome do cliente" />
      </div>
      <Campo rotulo="De" name="de" type="date" defaultValue={filtros.de === INICIO_HISTORICO ? "" : filtros.de} />
      <Campo rotulo="Até" name="ate" type="date" defaultValue={filtros.ate} />
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-6">
        <button type="submit" className={classesBotao("primario", "md", "flex-1 sm:flex-none")}>
          <Search className="size-4" aria-hidden /> Buscar
        </button>
        {temFiltro && (
          <Link href={visao === "clientes" ? "/admin/historico?ver=clientes" : "/admin/historico"} className={classesBotao("fantasma", "md")}>
            <X className="size-4" aria-hidden /> Limpar <IndicadorLink />
          </Link>
        )}
        <a href={`/admin/registros/exportar?${filtrosParaURL(filtros)}`} className={classesBotao("secundario", "md", "sm:ml-auto")} download>
          <Download className="size-4" aria-hidden /> Exportar CSV/Excel
        </a>
      </div>
    </form>
  );
}

/** Trabalhos agrupados por mês e por dia, do mais recente para o mais antigo. */
function LinhaDoTempo({ registros, filtros, pagina }: { registros: RegistroComPerfil[]; filtros: Filtros; pagina: number }) {
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const daPagina = registros.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  // Totais do mês inteiro (não só da página), para o cabeçalho de cada mês.
  const totaisMes = new Map<string, { trabalhos: number; minutos: number }>();
  for (const r of registros) {
    const t = totaisMes.get(r.data.slice(0, 7)) ?? { trabalhos: 0, minutos: 0 };
    t.trabalhos += 1;
    t.minutos += r.minutos_trabalhados ?? 0;
    totaisMes.set(r.data.slice(0, 7), t);
  }

  const meses: { mes: string; dias: { data: string; itens: RegistroComPerfil[] }[] }[] = [];
  for (const r of daPagina) {
    const mes = r.data.slice(0, 7);
    let m = meses[meses.length - 1];
    if (!m || m.mes !== mes) meses.push((m = { mes, dias: [] }));
    let d = m.dias[m.dias.length - 1];
    if (!d || d.data !== r.data) m.dias.push((d = { data: r.data, itens: [] }));
    d.itens.push(r);
  }

  return (
    <div className="space-y-8">
      {meses.map(({ mes, dias }) => {
        const t = totaisMes.get(mes)!;
        return (
          <section key={mes} aria-label={nomeDoMes(mes)}>
            <div className="sticky top-[112px] z-10 -mx-4 mb-3 flex items-baseline justify-between gap-3 bg-slate-50/95 px-4 py-2 backdrop-blur sm:top-[118px]">
              <h2 className="text-lg font-extrabold text-marca-800">{nomeDoMes(mes)}</h2>
              <p className="text-sm font-semibold text-slate-500">
                {t.trabalhos} {t.trabalhos === 1 ? "trabalho" : "trabalhos"} · {formatarMinutos(t.minutos)}
              </p>
            </div>
            <div className="space-y-5">
              {dias.map(({ data, itens }) => (
                <div key={data}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays className="size-4 text-marca-600" aria-hidden />
                    {dataPorExtenso(data)}
                  </h3>
                  <ul className="space-y-3 border-l-2 border-marca-100 pl-4">
                    {itens.map((r) => <CartaoTrabalho key={r.id} registro={r} />)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {totalPaginas > 1 && (
        <nav aria-label="Páginas do histórico" className="flex items-center justify-between gap-3">
          {atual > 1 ? (
            <Link href={urlHistorico(filtros, { pagina: atual - 1 })} className={classesBotao("secundario", "md")}>
              <ChevronLeft className="size-4" aria-hidden /> Mais recentes <IndicadorLink />
            </Link>
          ) : <span />}
          <p className="text-sm text-slate-500">Página {atual} de {totalPaginas}</p>
          {atual < totalPaginas ? (
            <Link href={urlHistorico(filtros, { pagina: atual + 1 })} className={classesBotao("secundario", "md")}>
              Mais antigos <ChevronRight className="size-4" aria-hidden /> <IndicadorLink />
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}

function CartaoTrabalho({ registro: r }: { registro: RegistroComPerfil }) {
  return (
    <li className="relative rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <span className="absolute -left-[23px] top-5 size-3 rounded-full border-2 border-white bg-marca-500 ring-2 ring-marca-100" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-base font-bold text-slate-900">{r.cliente}</p>
        {r.hora_saida ? <Selo cor="azul">{formatarMinutos(r.minutos_trabalhados)}</Selo> : <Selo cor="verde">Em andamento</Selo>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        <span className="flex items-center gap-1.5"><User className="size-4" aria-hidden /> {r.profiles?.nome ?? "—"}</span>
        <span className="flex items-center gap-1.5 tabular-nums"><Clock className="size-4" aria-hidden /> {formatarHora(r.hora_chegada)} – {formatarHora(r.hora_saida)}</span>
      </div>
      {r.servico && <p className="mt-3 whitespace-pre-wrap break-words text-slate-800">{r.servico}</p>}
      {(Number(r.valor_material) > 0 || r.valor_servico != null || Number(r.km_rodados) > 0) && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {Number(r.km_rodados) > 0 && <span>{formatarNumero(Number(r.km_rodados), 1)} km rodados</span>}
          {Number(r.valor_material) > 0 && <span>Material: {formatarMoeda(Number(r.valor_material))}</span>}
          {r.valor_servico != null && <span>Cobrado: {formatarMoeda(Number(r.valor_servico))}</span>}
        </p>
      )}
      {r.observacoes && (
        <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Obs.: </span>{r.observacoes}
        </p>
      )}
      <Anexos registro={r} compacto />
    </li>
  );
}

type Ordem = "recentes" | "mais" | "menos";
const PRAZOS = [0, 30, 60, 90, 180, 365];

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/**
 * Um cartão por cliente: trabalhos, horas, última visita, quem atendeu e há quantos dias
 * está sem serviço. Dá para ordenar por tempo sem serviço (seta) e filtrar quem está parado há X dias.
 */
function ListaClientes({ clientes, filtros, params }: { clientes: ReturnType<typeof totaisPorCliente>; filtros: Filtros; params: Parametros }) {
  const hoje = hojeSP();
  const ordem: Ordem = params.ordem === "mais" || params.ordem === "menos" ? params.ordem : "recentes";
  const parado = PRAZOS.includes(Number(params.parado)) ? Number(params.parado) : 0;
  const lista = clientes
    .map((c) => ({ ...c, diasSem: diasEntre(c.ultimaVisita, hoje) }))
    .filter((c) => c.diasSem >= parado)
    .sort((a, b) => (ordem === "menos" ? a.diasSem - b.diasSem : ordem === "mais" ? b.diasSem - a.diasSem : 0));
  const url = (extra: Record<string, string | number | undefined>) =>
    urlHistorico(filtros, { ver: "clientes", ordem: ordem === "recentes" ? undefined : ordem, parado: parado || undefined, ...extra });
  const proxima: Ordem = ordem === "mais" ? "menos" : "mais";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <Link href={url({ ordem: proxima })} className={classesBotao(ordem === "recentes" ? "secundario" : "primario", "md")}
          title={ordem === "mais" ? "Mostrando primeiro quem está há MAIS tempo sem serviço. Toque para inverter." : "Toque para ver primeiro quem está há mais tempo sem serviço."}>
          {ordem === "menos" ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
          Tempo sem serviço: {ordem === "menos" ? "menos tempo primeiro" : ordem === "mais" ? "mais tempo primeiro" : "ordenar"}
          <IndicadorLink />
        </Link>
        <span className="ml-1 text-sm text-slate-500">Sem serviço há:</span>
        <div className="flex flex-wrap gap-1">
          {PRAZOS.map((d) => (
            <Link key={d} href={url({ parado: d || undefined })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${parado === d ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
              {d === 0 ? "Todos" : `+${d} dias`}
            </Link>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente nessa faixa" texto={`Nenhum cliente está há mais de ${parado} dias sem serviço.`} />
      ) : (
    <Cartao className="p-0 sm:p-0">
      <ul className="divide-y divide-slate-100">
        {lista.map((c) => (
          <li key={c.cliente}>
            <Link
                href={urlHistorico({ ...filtros, cliente: c.cliente }, { ver: undefined, pagina: undefined })}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-marca-50/50 sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{c.cliente}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <Selo cor={c.diasSem >= 180 ? "ambar" : c.diasSem >= 60 ? "cinza" : "verde"}>
                    {c.diasSem === 0 ? "Atendido hoje" : `Há ${c.diasSem} ${c.diasSem === 1 ? "dia" : "dias"} sem serviço`}
                  </Selo>
                  Última visita {formatarData(c.ultimaVisita)}
                  {c.trabalhos > 1 && ` · primeira em ${formatarData(c.primeiraVisita)}`}
                </p>
                {c.colaboradores.length > 0 && <p className="mt-0.5 truncate text-xs text-slate-500">Atendido por {c.colaboradores.join(", ")}</p>}
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-lg font-bold tabular-nums text-marca-700">{formatarMinutos(c.minutos)}</p>
                  <p className="text-xs text-slate-500">{c.trabalhos} {c.trabalhos === 1 ? "trabalho" : "trabalhos"}</p>
                </div>
                <IndicadorLink className="size-5 text-marca-600" />
                <ChevronRight className="size-5 text-slate-300" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Cartao>
      )}
    </div>
  );
}
