"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, HardHat, ChevronRight, MapPin, MoveRight, Pencil, Phone, Plus, Save, Trash2, User } from "lucide-react";
import { excluirAgendamento, moverAgendamento, salvarAgendamento } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Estados";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { CampoHora } from "@/components/registros/CampoHora";
import { useToast, useToastDoResultado } from "@/components/ui/Toast";
import { dataPorExtenso, formatarData, formatarHora, somarDias } from "@/lib/datas";
import { MESES_CURTOS, STATUS, linkMapa, linkTelefone, type Agendamento } from "@/lib/agenda";
import { nomeMes } from "@/lib/fixos";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Props = {
  mes: string; // AAAA-MM-01
  hoje: string;
  inicioGrade: string;
  fimGrade: string;
  agendamentos: Agendamento[];
  porMes: number[];
  colaboradores: { id: string; nome: string }[];
};

type Janela = { tipo: "novo"; data: string } | { tipo: "ver" | "editar" | "mover" | "excluir"; item: Agendamento } | null;

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const corStatus = { agendado: "bg-marca-50 text-marca-900 ring-marca-200", concluido: "bg-emerald-50 text-emerald-900 ring-emerald-200 line-through decoration-emerald-400", cancelado: "bg-slate-100 text-slate-400 ring-slate-200 line-through" } as const;

function mesVizinho(mes: string, passo: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + passo, 1));
  return d.toISOString().slice(0, 7);
}

export function CalendarioAgenda({ mes, hoje, inicioGrade, fimGrade, agendamentos, porMes, colaboradores }: Props) {
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const toast = useToast();
  const nome = (id: string | null) => colaboradores.find((c) => c.id === id)?.nome ?? null;

  const dias: string[] = [];
  for (let d = inicioGrade; d <= fimGrade; d = somarDias(d, 1)) dias.push(d);
  const doDia = (d: string) => agendamentos.filter((a) => a.data === d);
  const doMes = agendamentos.filter((a) => a.data.slice(0, 7) === mes.slice(0, 7));
  const ano = mes.slice(0, 4);

  function mover(id: string, data: string) {
    const item = agendamentos.find((a) => a.id === id);
    if (!item || item.data === data) return;
    iniciar(async () => {
      const r = await moverAgendamento(id, data);
      toast(r.ok ? "sucesso" : "erro", r.mensagem);
    });
  }

  // Cartão de um serviço na grade (arrastável). Função (não componente) para não remontar a cada render.
  const cartaozinho = (a: Agendamento) => (
    <button
      key={a.id}
      type="button"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", a.id); setArrastando(a.id); }}
      onDragEnd={() => { setArrastando(null); setAlvo(null); }}
      onClick={() => setJanela({ tipo: "ver", item: a })}
      className={`block w-full cursor-grab truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold ring-1 active:cursor-grabbing ${corStatus[a.status]} ${arrastando === a.id ? "opacity-40" : ""}`}
      title={`${a.hora ? formatarHora(a.hora) + " · " : ""}${a.cliente}${nome(a.colaborador_id) ? " · " + nome(a.colaborador_id) : ""}`}
    >
      {a.obra_id && <HardHat className="mr-0.5 inline size-3 align-[-2px]" aria-label="Serviço em andamento" />}
      {a.hora && <span className="tabular-nums">{formatarHora(a.hora)} </span>}
      {a.cliente}
    </button>
  );

  return (
    <>
      {/* Navegação: mês anterior / próximo, hoje e os 12 meses do ano */}
      <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Link href={`/admin/agenda?mes=${mesVizinho(mes, -1)}`} className={classesBotao("fantasma", "md", "px-3")} aria-label="Mês anterior"><ChevronLeft className="size-5" /></Link>
            <h2 className="min-w-44 text-center text-lg font-extrabold text-slate-900">{cap(nomeMes(mes))}</h2>
            <Link href={`/admin/agenda?mes=${mesVizinho(mes, 1)}`} className={classesBotao("fantasma", "md", "px-3")} aria-label="Próximo mês"><ChevronRight className="size-5" /></Link>
            <IndicadorLink />
          </div>
          <div className="flex flex-wrap gap-2">
            {mes.slice(0, 7) !== hoje.slice(0, 7) && <Link href="/admin/agenda" className={classesBotao("secundario", "md")}><CalendarDays className="size-4" aria-hidden /> Hoje</Link>}
            <Botao onClick={() => setJanela({ tipo: "novo", data: mes.slice(0, 7) === hoje.slice(0, 7) ? hoje : mes })}><Plus className="size-4" aria-hidden /> Agendar serviço</Botao>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-12" aria-label={`Meses de ${ano}`}>
          {MESES_CURTOS.map((m, i) => {
            const chave = `${ano}-${String(i + 1).padStart(2, "0")}`;
            const atual = chave === mes.slice(0, 7);
            return (
              <Link key={m} href={`/admin/agenda?mes=${chave}`}
                className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold ring-1 ${atual ? "bg-marca-600 text-white ring-marca-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                {m}
                {porMes[i] > 0 && <span className={`ml-1 rounded-full px-1.5 text-[10px] ${atual ? "bg-white/25" : "bg-marca-100 text-marca-800"}`}>{porMes[i]}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Computador/tablet: grade do mês com arrastar e soltar */}
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
          {DIAS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const fora = d.slice(0, 7) !== mes.slice(0, 7);
            const itens = doDia(d);
            return (
              <div
                key={d}
                onDragOver={(e) => { e.preventDefault(); setAlvo(d); }}
                onDragLeave={() => setAlvo((x) => (x === d ? null : x))}
                onDrop={(e) => { e.preventDefault(); setAlvo(null); mover(e.dataTransfer.getData("text/plain"), d); }}
                className={`group min-h-28 border-b border-r border-slate-100 p-1.5 ${fora ? "bg-slate-50/60" : ""} ${alvo === d ? "bg-marca-50 ring-2 ring-inset ring-marca-400" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${d === hoje ? "bg-marca-600 text-white" : fora ? "text-slate-300" : "text-slate-700"}`}>{Number(d.slice(8))}</span>
                  <button type="button" onClick={() => setJanela({ tipo: "novo", data: d })} className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-marca-600 group-hover:opacity-100 focus:opacity-100" aria-label={`Agendar em ${formatarData(d)}`}>
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="space-y-1">{itens.map(cartaozinho)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: lista dos dias do mês que têm serviço */}
      <div className="space-y-3 md:hidden">
        {doMes.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Nenhum serviço agendado em {nomeMes(mes)}.</p>}
        {[...new Set(doMes.map((a) => a.data))].map((d) => (
          <section key={d}>
            <h3 className={`mb-1.5 text-sm font-bold ${d === hoje ? "text-marca-700" : "text-slate-700"}`}>{dataPorExtenso(d)}{d === hoje ? " · hoje" : ""}</h3>
            <ul className="space-y-2">
              {doDia(d).map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setJanela({ tipo: "ver", item: a })} className={`w-full rounded-xl p-3 text-left ring-1 ${corStatus[a.status]}`}>
                    <p className="font-bold">{a.hora && <span className="tabular-nums">{formatarHora(a.hora)} · </span>}{a.cliente}</p>
                    {(a.servico || nome(a.colaborador_id)) && <p className="mt-0.5 text-xs opacity-80">{[nome(a.colaborador_id), a.servico].filter(Boolean).join(" · ")}</p>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Ver detalhes */}
      <Modal aberto={janela?.tipo === "ver"} aoFechar={fechar} titulo="Serviço agendado">
        {janela?.tipo === "ver" && (() => {
          const a = janela.item;
          return (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{a.cliente}</p>
                <p className="text-sm text-slate-600">{dataPorExtenso(a.data)}{a.hora ? ` às ${formatarHora(a.hora)}` : ""}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Selo cor={a.status === "agendado" ? "azul" : a.status === "concluido" ? "verde" : "cinza"}>{STATUS.find((s) => s.valor === a.status)?.rotulo}</Selo>
                  {a.obra_id && (
                    <Link href="/admin/agenda?aba=andamento" className="inline-flex items-center gap-1 text-xs font-semibold text-marca-700 underline">
                      <HardHat className="size-3.5" aria-hidden /> Parte de um serviço em andamento
                    </Link>
                  )}
                </div>
              </div>
              <dl className="space-y-1.5 text-sm text-slate-700">
                {nome(a.colaborador_id) && <p className="flex items-center gap-2"><User className="size-4 text-slate-400" aria-hidden /> {nome(a.colaborador_id)}</p>}
                {a.endereco && <p className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" aria-hidden /> <a href={linkMapa(a.endereco)} target="_blank" rel="noopener" className="text-marca-600 underline">{a.endereco}</a></p>}
                {a.telefone && <p className="flex items-center gap-2"><Phone className="size-4 text-slate-400" aria-hidden /> <a href={linkTelefone(a.telefone)} className="text-marca-600 underline">{a.telefone}</a></p>}
                {a.servico && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5">{a.servico}</p>}
                {a.observacoes && <p className="whitespace-pre-wrap text-slate-500">Obs.: {a.observacoes}</p>}
              </dl>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <Botao variante="perigoSuave" onClick={() => setJanela({ tipo: "excluir", item: a })}><Trash2 className="size-4" aria-hidden /> Excluir</Botao>
                <Botao variante="secundario" onClick={() => setJanela({ tipo: "mover", item: a })}><MoveRight className="size-4" aria-hidden /> Mover</Botao>
                <Botao onClick={() => setJanela({ tipo: "editar", item: a })}><Pencil className="size-4" aria-hidden /> Editar</Botao>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Novo / editar */}
      <Modal aberto={janela?.tipo === "novo" || janela?.tipo === "editar"} aoFechar={fechar} titulo={janela?.tipo === "editar" ? "Editar agendamento" : "Agendar serviço"}>
        {janela?.tipo === "editar" && <FormAgendamento key={janela.item.id} item={janela.item} data={janela.item.data} colaboradores={colaboradores} aoConcluir={fechar} />}
        {janela?.tipo === "novo" && <FormAgendamento key={`novo-${janela.data}`} data={janela.data} colaboradores={colaboradores} aoConcluir={fechar} />}
      </Modal>

      {/* Mover para outro dia */}
      <Modal aberto={janela?.tipo === "mover"} aoFechar={fechar} titulo="Mover para outro dia" largura="sm">
        {janela?.tipo === "mover" && <FormMover item={janela.item} aoMover={(d) => { mover(janela.item.id, d); fechar(); }} aoCancelar={fechar} />}
      </Modal>

      <ExcluirAgendamento item={janela?.tipo === "excluir" ? janela.item : null} aoFechar={fechar} />
    </>
  );
}

function FormAgendamento({ item, data, colaboradores, aoConcluir }: { item?: Agendamento; data: string; colaboradores: { id: string; nome: string }[]; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(salvarAgendamento, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const v = (c: string, o: string) => estado.valores?.[c] ?? o;
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data" name="data" type="date" defaultValue={v("data", data)} erro={e.data} obrigatorio />
        <CampoHora rotulo="Hora (opcional)" name="hora" defaultValue={v("hora", item?.hora ? formatarHora(item.hora) : "")} erro={e.hora} />
      </div>
      <Campo rotulo="Cliente" name="cliente" defaultValue={v("cliente", item?.cliente ?? "")} erro={e.cliente} obrigatorio maxLength={200} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Endereço (opcional)" name="endereco" defaultValue={v("endereco", item?.endereco ?? "")} maxLength={300} />
        <Campo rotulo="Telefone (opcional)" name="telefone" type="tel" inputMode="tel" defaultValue={v("telefone", item?.telefone ?? "")} maxLength={30} />
      </div>
      <Selecao rotulo="Eletricista (opcional)" name="colaborador_id" defaultValue={v("colaborador_id", item?.colaborador_id ?? "")}>
        <option value="">— A definir —</option>
        {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </Selecao>
      <AreaTexto rotulo="Serviço a fazer (opcional)" name="servico" defaultValue={v("servico", item?.servico ?? "")} rows={2} maxLength={2000} />
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v("observacoes", item?.observacoes ?? "")} rows={2} maxLength={2000} />
      {item && (
        <Selecao rotulo="Situação" name="status" defaultValue={v("status", item.status)}>
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </Selecao>
      )}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> {item ? "Salvar" : "Agendar"}</BotaoEnviar>
      </div>
    </form>
  );
}

function FormMover({ item, aoMover, aoCancelar }: { item: Agendamento; aoMover: (data: string) => void; aoCancelar: () => void }) {
  const [data, setData] = useState(item.data);
  const atalhos = [["Amanhã", 1], ["+1 semana", 7], ["Ontem", -1]] as const;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600"><strong>{item.cliente}</strong> está em {formatarData(item.data)}{item.hora ? ` às ${formatarHora(item.hora)}` : ""}.</p>
      <Campo rotulo="Nova data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {atalhos.map(([r, n]) => (
          <button key={r} type="button" onClick={() => setData(somarDias(item.data, n))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-marca-700 ring-1 ring-marca-200 hover:bg-marca-50">{r}</button>
        ))}
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => aoMover(data)} disabled={!data || data === item.data}><MoveRight className="size-5" aria-hidden /> Mover</Botao>
      </div>
    </div>
  );
}

function ExcluirAgendamento({ item, aoFechar }: { item: Agendamento | null; aoFechar: () => void }) {
  const [estado, excluir] = useActionState(excluirAgendamento, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoFechar);
  return (
    <Modal aberto={!!item} aoFechar={aoFechar} titulo="Excluir agendamento?" largura="sm">
      {item && (
        <form action={excluir} className="space-y-5">
          <input type="hidden" name="id" value={item.id} />
          <p className="text-slate-600">O agendamento de <strong>{item.cliente}</strong> em {formatarData(item.data)} será excluído. (Para manter no histórico, edite e marque como “Cancelado”.)</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
            <BotaoEnviar variante="perigo" textoCarregando="Excluindo..."><Trash2 className="size-5" aria-hidden /> Sim, excluir</BotaoEnviar>
          </div>
        </form>
      )}
    </Modal>
  );
}

