"use client";

import { useActionState, useState } from "react";
import { CalendarCheck, CalendarClock, Pause, Pencil, Play, Plus, Save, Trash2 } from "lucide-react";
import { alterarGastoFixoAtivo, excluirGastoFixo, excluirItemDoMes, salvarGastoFixo, salvarItemDoMes } from "./fixos-actions";
import { Cartao, TituloSecao } from "@/components/ui/Cartao";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { CampoDinheiro } from "@/components/ui/CampoDinheiro";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData } from "@/lib/datas";
import { formatarMoeda, paraCampo } from "@/lib/gastos";
import { CATEGORIAS, nomeMes, rotuloCategoria, ultimoDiaDoMes, type GastoFixo, type GastoFixoMes } from "@/lib/fixos";
import { RESULTADO_INICIAL, type Resultado } from "@/lib/tipos";

export type ResumoMes = {
  mes: string;
  fechado: boolean;
  lucroServicos: number;
  servicos: number;
  itens: GastoFixoMes[];
};

type Acao = (a: Resultado, f: FormData) => Promise<Resultado>;
type Edicao =
  | { tipo: "fixo"; item?: GastoFixo }
  | { tipo: "mes"; mes: string; item?: GastoFixoMes }
  | { tipo: "excluirFixo"; item: GastoFixo }
  | null;

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function GastosFixos({ fixos, meses }: { fixos: GastoFixo[]; meses: ResumoMes[] }) {
  const [edicao, setEdicao] = useState<Edicao>(null);
  const fechar = () => setEdicao(null);
  const [estAtivo, alternarAtivo] = useActionState(alterarGastoFixoAtivo, RESULTADO_INICIAL);
  const [estExcluir, excluir] = useActionState(excluirGastoFixo, RESULTADO_INICIAL);
  const [estExcluirItem, excluirItem] = useActionState(excluirItemDoMes, RESULTADO_INICIAL);
  useToastDoResultado(estAtivo);
  useToastDoResultado(estExcluir, fechar);
  useToastDoResultado(estExcluirItem);
  const totalMensal = fixos.filter((f) => f.ativo).reduce((s, f) => s + f.valor, 0);

  return (
    <div className="space-y-6">
      <Cartao>
        <TituloSecao acao={<Botao onClick={() => setEdicao({ tipo: "fixo" })}><Plus className="size-4" aria-hidden /> Adicionar gasto fixo</Botao>}>
          Gastos fixos de todo mês
        </TituloSecao>
        <p className="-mt-2 mb-4 text-sm text-slate-500">
          Salários, ferramentas, manutenção do carro... No <strong>último dia de cada mês</strong> eles são descontados automaticamente do lucro daquele mês.
        </p>
        {fixos.length === 0 ? (
          <EstadoVazio titulo="Nenhum gasto fixo cadastrado" texto="Adicione, por exemplo, o salário de cada colaborador, ferramentas e a manutenção dos carros." />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {fixos.map((f) => (
                <li key={f.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${f.ativo ? "" : "bg-slate-50"}`}>
                  <div className="min-w-0">
                    <p className={`font-semibold ${f.ativo ? "text-slate-900" : "text-slate-400 line-through"}`}>{f.descricao}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      <Selo cor="azul">{rotuloCategoria(f.categoria)}</Selo>
                      {!f.ativo && <Selo cor="cinza">Pausado</Selo>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <p className="mr-2 font-bold tabular-nums text-slate-900">{formatarMoeda(f.valor)}<span className="text-xs font-normal text-slate-500">/mês</span></p>
                    <Botao variante="fantasma" className="px-3" onClick={() => setEdicao({ tipo: "fixo", item: f })} aria-label={`Editar ${f.descricao}`}><Pencil className="size-4" aria-hidden /></Botao>
                    <form action={alternarAtivo}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="ativo" value={String(!f.ativo)} />
                      <BotaoEnviar variante="fantasma" className="px-3" aria-label={f.ativo ? `Pausar ${f.descricao}` : `Retomar ${f.descricao}`} title={f.ativo ? "Pausar (não entra nos próximos meses)" : "Retomar"}>
                        {f.ativo ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                      </BotaoEnviar>
                    </form>
                    <Botao variante="perigoSuave" className="px-3" onClick={() => setEdicao({ tipo: "excluirFixo", item: f })} aria-label={`Excluir ${f.descricao}`}><Trash2 className="size-4" aria-hidden /></Botao>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm text-slate-600">Total por mês: <strong className="tabular-nums text-slate-900">{formatarMoeda(totalMensal)}</strong></p>
          </>
        )}
      </Cartao>

      <section aria-label="Meses">
        <TituloSecao>Lucro final de cada mês</TituloSecao>
        {meses.length === 0 ? (
          <EstadoVazio titulo="Nenhum mês ainda" texto="Os meses aparecem aqui assim que houver serviços ou gastos fixos." />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {meses.map((m) => {
              const fixosMes = m.fechado ? m.itens.reduce((s, i) => s + i.valor, 0) : totalMensal;
              const final = m.lucroServicos - fixosMes;
              return (
                <li key={m.mes} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{cap(nomeMes(m.mes))}</h3>
                    {m.fechado ? (
                      <Selo cor="verde"><CalendarCheck className="size-3" aria-hidden /> Fechado</Selo>
                    ) : (
                      <Selo cor="ambar"><CalendarClock className="size-3" aria-hidden /> Fecha em {formatarData(ultimoDiaDoMes(m.mes))}</Selo>
                    )}
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-500">Lucro dos serviços ({m.servicos})</dt><dd className="tabular-nums">{formatarMoeda(m.lucroServicos)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">− Gastos fixos{m.fechado ? "" : " (previsto)"}</dt><dd className="tabular-nums">{formatarMoeda(fixosMes)}</dd></div>
                    <div className={`flex justify-between border-t border-slate-100 pt-1 font-bold ${final >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      <dt>{m.fechado ? "Lucro final" : "Lucro final previsto"}</dt><dd className="tabular-nums">{formatarMoeda(final)}</dd>
                    </div>
                  </dl>
                  {m.fechado ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Gastos fixos lançados</p>
                      {m.itens.length === 0 && <p className="text-sm text-slate-500">Nenhum.</p>}
                      <ul className="divide-y divide-slate-200/70">
                        {m.itens.map((i) => (
                          <li key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <span className="min-w-0 truncate">{i.descricao} <span className="text-xs text-slate-400">· {rotuloCategoria(i.categoria)}</span></span>
                            <span className="flex shrink-0 items-center gap-1">
                              <span className="tabular-nums">{formatarMoeda(i.valor)}</span>
                              <button type="button" onClick={() => setEdicao({ tipo: "mes", mes: m.mes, item: i })} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label={`Editar ${i.descricao}`}><Pencil className="size-4" aria-hidden /></button>
                              <form action={excluirItem}>
                                <input type="hidden" name="id" value={i.id} />
                                <button type="submit" className="rounded-lg p-2 text-red-600 hover:bg-white" aria-label={`Remover ${i.descricao} deste mês`}><Trash2 className="size-4" aria-hidden /></button>
                              </form>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Botao variante="fantasma" className="mt-1 px-2" onClick={() => setEdicao({ tipo: "mes", mes: m.mes })}><Plus className="size-4" aria-hidden /> Adicionar neste mês</Botao>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No último dia do mês os gastos fixos cadastrados acima são lançados aqui. Depois você pode ajustar os valores deste mês.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal aberto={edicao?.tipo === "fixo" || edicao?.tipo === "mes"} aoFechar={fechar}
        titulo={edicao?.tipo === "mes" ? `${edicao.item ? "Editar" : "Adicionar"} gasto – ${nomeMes(edicao.mes)}` : edicao?.tipo === "fixo" && edicao.item ? "Editar gasto fixo" : "Adicionar gasto fixo"} largura="sm">
        {(edicao?.tipo === "fixo" || edicao?.tipo === "mes") && (
          <FormItem
            key={edicao.item?.id ?? "novo"}
            acao={edicao.tipo === "fixo" ? salvarGastoFixo : salvarItemDoMes}
            item={edicao.item}
            mes={edicao.tipo === "mes" ? edicao.mes : undefined}
            aoConcluir={fechar}
          />
        )}
      </Modal>

      <Modal aberto={edicao?.tipo === "excluirFixo"} aoFechar={fechar} titulo="Excluir gasto fixo?" largura="sm">
        {edicao?.tipo === "excluirFixo" && (
          <form action={excluir} className="space-y-5">
            <input type="hidden" name="id" value={edicao.item.id} />
            <p className="text-slate-600"><strong>{edicao.item.descricao}</strong> deixa de ser descontado nos próximos meses. Os meses já fechados continuam como estão. (Para só suspender por um tempo, use o botão de pausar.)</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
              <BotaoEnviar variante="perigo" textoCarregando="Excluindo..."><Trash2 className="size-5" aria-hidden /> Sim, excluir</BotaoEnviar>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function FormItem({ acao, item, mes, aoConcluir }: { acao: Acao; item?: { id: string; descricao: string; categoria: string; valor: number }; mes?: string; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(acao, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const v = (c: string, o: string) => estado.valores?.[c] ?? o;
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      {mes && <input type="hidden" name="mes" value={mes} />}
      <Campo rotulo="Descrição" name="descricao" placeholder="Ex.: Salário do João" defaultValue={v("descricao", item?.descricao ?? "")} erro={e.descricao} obrigatorio maxLength={120} />
      <Selecao rotulo="Categoria" name="categoria" defaultValue={v("categoria", item?.categoria ?? "salario")} erro={e.categoria} obrigatorio>
        {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
      </Selecao>
      <CampoDinheiro rotulo={mes ? "Valor neste mês" : "Valor por mês"} name="valor" defaultValue={v("valor", paraCampo(item?.valor))} erro={e.valor} obrigatorio />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
