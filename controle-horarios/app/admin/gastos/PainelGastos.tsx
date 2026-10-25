"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Fuel, HandCoins, Package, Pencil, Plus, Save, Trash2, User, Wrench, Zap } from "lucide-react";
import { excluirLancamento, salvarLancamento } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { CampoDinheiro } from "@/components/ui/CampoDinheiro";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import {
  calcular, formatarMargem, formatarMoeda, formatarNumero, lerHoras, lerNumero, paraCampo,
  type Calculo, type Configuracoes, type LancamentoCusto, type Veiculo,
} from "@/lib/gastos";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Props = { lancamentos: LancamentoCusto[]; veiculos: Veiculo[]; config: Configuracoes; hoje: string };

type Janela = { tipo: "novo" } | { tipo: "editar" | "excluir"; lancamento: LancamentoCusto } | null;

export function PainelGastos({ lancamentos, veiculos, config, hoje }: Props) {
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [estadoExclusao, excluir] = useActionState(excluirLancamento, RESULTADO_INICIAL);
  useToastDoResultado(estadoExclusao, fechar);
  const faltando = lancamentos.filter((l) => l.registro_id && !l.valor_servico_informado).length;

  return (
    <section aria-label="Lançamentos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Serviços</h2>
          <p className="text-sm text-slate-500">
            <Zap className="mr-1 inline size-4 text-amber-500" aria-hidden />
            Os serviços registrados pelos eletricistas entram aqui sozinhos.
          </p>
        </div>
        <Botao variante="secundario" onClick={() => setJanela({ tipo: "novo" })}>
          <Plus className="size-5" aria-hidden /> Lançamento avulso
        </Botao>
      </div>

      {faltando > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          {faltando === 1 ? "1 serviço está" : `${faltando} serviços estão`} sem o valor cobrado. Toque em “Completar” no serviço.
        </p>
      )}

      {lancamentos.length === 0 ? (
        <EstadoVazio titulo="Nenhum serviço neste período" texto="Quando um eletricista registrar a saída de um atendimento, o serviço aparece aqui com os gastos calculados." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lancamentos.map((l) => (
            <CartaoLancamento
              key={l.id}
              lancamento={l}
              aoEditar={() => setJanela({ tipo: "editar", lancamento: l })}
              aoExcluir={() => setJanela({ tipo: "excluir", lancamento: l })}
            />
          ))}
        </ul>
      )}

      <Modal aberto={janela?.tipo === "novo" || janela?.tipo === "editar"} aoFechar={fechar} titulo={janela?.tipo === "editar" ? "Editar gastos do serviço" : "Lançamento avulso"} largura="lg">
        {(janela?.tipo === "novo" || janela?.tipo === "editar") && (
          <FormLancamento
            key={janela.tipo === "editar" ? janela.lancamento.id : "novo"}
            lancamento={janela.tipo === "editar" ? janela.lancamento : undefined}
            veiculos={veiculos}
            config={config}
            hoje={hoje}
            aoConcluir={fechar}
          />
        )}
      </Modal>

      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo="Excluir lançamento?" largura="sm">
        {janela?.tipo === "excluir" && (
          <form action={excluir} className="space-y-5">
            <input type="hidden" name="id" value={janela.lancamento.id} />
            <p className="text-slate-600">
              {janela.lancamento.registro_id ? (
                <>O serviço <strong>{janela.lancamento.cliente}</strong> ({formatarData(janela.lancamento.data)}) foi registrado por um eletricista. Excluir aqui apaga <strong>o registro inteiro</strong> (horário, serviço e gastos).</>
              ) : (
                <>O lançamento <strong>{janela.lancamento.cliente}</strong> ({formatarData(janela.lancamento.data)}) será excluído.</>
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
              <BotaoEnviar variante="perigo" textoCarregando="Excluindo...">
                <Trash2 className="size-5" aria-hidden /> Sim, excluir
              </BotaoEnviar>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

function CartaoLancamento({ lancamento: l, aoEditar, aoExcluir }: { lancamento: LancamentoCusto; aoEditar: () => void; aoExcluir: () => void }) {
  const c = calcular(l);
  const positivo = c.lucro >= 0;
  const semValor = Boolean(l.registro_id) && !l.valor_servico_informado;
  return (
    <li className={`flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ${semValor ? "ring-amber-300" : "ring-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{l.cliente}</p>
          <p className="text-xs text-slate-500">
            {formatarData(l.data)}
            {l.veiculo_nome && ` · ${l.veiculo_nome}, ${formatarNumero(l.km_rodados, 1)} km`}
            {l.horas > 0 && ` · ${formatarMinutos(Math.round(l.horas * 60))}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {l.registro_id ? (
              <Selo cor="azul"><User className="size-3" aria-hidden /> {l.colaborador ?? "Eletricista"} · automático</Selo>
            ) : (
              <Selo cor="cinza">Avulso</Selo>
            )}
            {semValor && <Selo cor="ambar">Falta o valor cobrado</Selo>}
          </div>
          {l.descricao && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{l.descricao}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-extrabold tabular-nums ${positivo ? "text-emerald-700" : "text-red-600"}`}>{formatarMoeda(c.lucro)}</p>
          <p className={`text-xs font-bold ${positivo ? "text-emerald-700" : "text-red-600"}`}>{formatarMargem(c.margem)} de lucro</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <dl className="rounded-xl bg-emerald-50/60 px-3 py-2 text-sm ring-1 ring-emerald-100">
          <dt className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">Ganhos</dt>
          <Linha rotulo="Serviço cobrado" valor={l.valor_servico} />
          <Linha rotulo="Material" valor={l.valor_material} />
          <Linha rotulo="Total" valor={c.receita} forte />
        </dl>
        <dl className="rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-100">
          <dt className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">Gastos</dt>
          <Linha rotulo="Gasolina" valor={c.custoGasolina} />
          <Linha rotulo="Mão de obra" valor={c.custoMaoDeObra} />
          <Linha rotulo="Total" valor={c.custoTotal} forte />
        </dl>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Botao variante={semValor ? "primario" : "fantasma"} onClick={aoEditar}><Pencil className="size-4" aria-hidden /> {semValor ? "Completar" : "Editar"}</Botao>
        <Botao variante="perigoSuave" onClick={aoExcluir}><Trash2 className="size-4" aria-hidden /> Excluir</Botao>
      </div>
    </li>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${forte ? "mt-0.5 border-t border-black/5 pt-0.5" : ""}`}>
      <span className="text-slate-500">{rotulo}</span>
      <span className={`tabular-nums ${forte ? "font-bold text-slate-900" : "text-slate-700"}`}>{formatarMoeda(valor)}</span>
    </div>
  );
}

type PropsForm = {
  lancamento?: LancamentoCusto;
  veiculos: Veiculo[];
  config: Configuracoes;
  hoje: string;
  aoConcluir: () => void;
};

/**
 * Formulário do lançamento, com a conta do lucro sendo feita enquanto se digita.
 * Se o lançamento veio de um registro de eletricista, data, cliente, descrição e horas
 * vêm do registro (só leitura aqui); o resto, ao salvar, atualiza também o registro.
 */
function FormLancamento({ lancamento: l, veiculos, config, hoje, aoConcluir }: PropsForm) {
  const [estado, enviar] = useActionState(salvarLancamento, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  // Campos mexidos depois do último envio não mostram mais o erro antigo.
  const [mexidos, setMexidos] = useState<{ em?: number; campos: string[] }>({ campos: [] });
  const camposMexidos = mexidos.em === estado.em ? mexidos.campos : [];
  const e = Object.fromEntries(Object.entries(estado.erros ?? {}).filter(([k]) => !camposMexidos.includes(k)));
  const ligado = Boolean(l?.registro_id);

  const [v, setV] = useState({
    data: l?.data ?? hoje,
    cliente: l?.cliente ?? "",
    descricao: l?.descricao ?? "",
    valor_material: paraCampo(l?.valor_material),
    veiculo_id: l?.veiculo_id ?? "",
    km_rodados: paraCampo(l?.km_rodados, 1),
    preco_gasolina: paraCampo(l ? l.preco_gasolina : config.preco_gasolina, 3),
    horas: paraCampo(l?.horas),
    valor_hora: paraCampo(l ? l.valor_hora : config.valor_hora_padrao),
    valor_servico: l && (l.valor_servico_informado || !l.registro_id) ? paraCampo(l.valor_servico) : "",
  });
  const mudar = (campo: keyof typeof v) => (ev: { target: { value: string } }) => {
    setV((s) => ({ ...s, [campo]: ev.target.value }));
    setMexidos({ em: estado.em, campos: [...camposMexidos, campo] });
  };

  // Carros na lista: os ativos + o carro já usado neste lançamento (mesmo que desativado).
  const carros = veiculos.filter((c) => c.ativo || c.id === l?.veiculo_id);
  const carro = veiculos.find((c) => c.id === v.veiculo_id) ?? null;
  // Se o carro não mudou, vale o consumo guardado no dia; se mudou, o do carro escolhido.
  const consumo = l && v.veiculo_id === (l.veiculo_id ?? "") ? l.consumo_km_l : carro?.consumo_km_l ?? null;

  const calculo = useMemo(
    () =>
      calcular({
        valor_material: lerNumero(v.valor_material) ?? 0,
        km_rodados: lerNumero(v.km_rodados) ?? 0,
        consumo_km_l: consumo,
        preco_gasolina: lerNumero(v.preco_gasolina) ?? 0,
        horas: lerHoras(v.horas) ?? 0,
        valor_hora: lerNumero(v.valor_hora) ?? 0,
        valor_servico: lerNumero(v.valor_servico) ?? 0,
      }),
    [v, consumo],
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {l && <input type="hidden" name="id" value={l.id} />}

      {ligado ? (
        <div className="rounded-xl bg-marca-50 px-4 py-3 text-sm text-marca-900 ring-1 ring-marca-100">
          <p className="font-bold">{v.cliente} · {formatarData(v.data)}</p>
          <p className="mt-0.5">
            Registrado por <strong>{l?.colaborador ?? "eletricista"}</strong>
            {(l?.horas ?? 0) > 0 && <> · {formatarMinutos(Math.round((l?.horas ?? 0) * 60))} trabalhadas</>}
          </p>
          {v.descricao && <p className="mt-1 text-marca-800">{v.descricao}</p>}
          <p className="mt-2 text-xs text-marca-700">Cliente, data, serviço e horas vêm do registro do eletricista (para mudar, edite na aba Registros). O que você alterar abaixo também atualiza o registro.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Campo rotulo="Data" name="data" type="date" value={v.data} onChange={mudar("data")} erro={e.data} obrigatorio />
            <Campo rotulo="Cliente" name="cliente" value={v.cliente} onChange={mudar("cliente")} erro={e.cliente} obrigatorio maxLength={200} />
          </div>
          <AreaTexto rotulo="Descrição do serviço (opcional)" name="descricao" value={v.descricao} onChange={mudar("descricao")} erro={e.descricao} rows={2} maxLength={2000} />
        </>
      )}

      <Grupo icone={<HandCoins className="size-4" aria-hidden />} titulo="Ganhos">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoDinheiro rotulo="Valor do serviço (cobrado do cliente)" name="valor_servico" value={v.valor_servico} onChange={mudar("valor_servico")} erro={e.valor_servico} obrigatorio />
          <CampoDinheiro rotulo="Valor do material" name="valor_material" value={v.valor_material} onChange={mudar("valor_material")} erro={e.valor_material}
            ajuda="O material é da loja: entra como ganho." />
        </div>
      </Grupo>

      <Grupo icone={<Fuel className="size-4" aria-hidden />} titulo="Gasolina">
        <div className="grid gap-4 sm:grid-cols-3">
          <Selecao rotulo="Carro" name="veiculo_id" value={v.veiculo_id} onChange={mudar("veiculo_id")} erro={e.veiculo_id}>
            <option value="">— Nenhum —</option>
            {carros.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} ({formatarNumero(c.consumo_km_l)} km/l){c.ativo ? "" : " – fora da lista"}</option>
            ))}
          </Selecao>
          <Campo rotulo="Km rodados (ida e volta)" name="km_rodados" inputMode="decimal" placeholder="0" value={v.km_rodados} onChange={mudar("km_rodados")} erro={e.km_rodados} />
          <CampoDinheiro rotulo="Preço do litro" name="preco_gasolina" value={v.preco_gasolina} onChange={mudar("preco_gasolina")} erro={e.preco_gasolina} />
        </div>
        {consumo && calculo.litros > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {formatarNumero(lerNumero(v.km_rodados) ?? 0, 1)} km ÷ {formatarNumero(consumo)} km/l = {formatarNumero(calculo.litros)} litros × {formatarMoeda(lerNumero(v.preco_gasolina) ?? 0)} = <strong>{formatarMoeda(calculo.custoGasolina)}</strong>
          </p>
        )}
      </Grupo>

      <Grupo icone={<Wrench className="size-4" aria-hidden />} titulo="Mão de obra do eletricista">
        <div className="grid gap-4 sm:grid-cols-2">
          {ligado ? (
            <>
              <input type="hidden" name="horas" value={v.horas} />
              <Campo rotulo="Horas trabalhadas" value={v.horas || "0"} disabled ajuda="Vem do registro de chegada e saída." />
            </>
          ) : (
            <Campo rotulo="Horas trabalhadas" name="horas" inputMode="decimal" placeholder="Ex.: 3,5 ou 3:30" value={v.horas} onChange={mudar("horas")} erro={e.horas} />
          )}
          <CampoDinheiro rotulo="Valor da hora" name="valor_hora" value={v.valor_hora} onChange={mudar("valor_hora")} erro={e.valor_hora} />
        </div>
      </Grupo>

      <Resumo calculo={calculo} material={lerNumero(v.valor_material) ?? 0} valorServico={lerNumero(v.valor_servico) ?? 0} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando...">
          <Save className="size-5" aria-hidden /> {l ? "Salvar alterações" : "Salvar lançamento"}
        </BotaoEnviar>
      </div>
    </form>
  );
}

function Grupo({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="flex items-center gap-1.5 px-1.5 text-sm font-bold text-marca-700">{icone} {titulo}</legend>
      {children}
    </fieldset>
  );
}

function Resumo({ calculo: c, material, valorServico }: { calculo: Calculo; material: number; valorServico: number }) {
  const positivo = c.lucro >= 0;
  return (
    <div className={`rounded-xl p-4 ring-1 ${positivo ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`} aria-live="polite">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <dl>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Ganhos</dt>
          <dd className="flex justify-between"><span className="text-slate-500">Serviço</span><span className="tabular-nums">{formatarMoeda(valorServico)}</span></dd>
          <dd className="flex justify-between"><span className="text-slate-500">Material</span><span className="tabular-nums">{formatarMoeda(material)}</span></dd>
          <dd className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{formatarMoeda(c.receita)}</span></dd>
        </dl>
        <dl>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Gastos</dt>
          <dd className="flex justify-between"><span className="text-slate-500">Gasolina</span><span className="tabular-nums">{formatarMoeda(c.custoGasolina)}</span></dd>
          <dd className="flex justify-between"><span className="text-slate-500">Mão de obra</span><span className="tabular-nums">{formatarMoeda(c.custoMaoDeObra)}</span></dd>
          <dd className="flex justify-between font-bold"><span>Total</span><span className="tabular-nums">{formatarMoeda(c.custoTotal)}</span></dd>
        </dl>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-black/10 pt-3">
        <p className="text-xs text-slate-600">Lucro = ganhos − gastos</p>
        <p className={`text-right ${positivo ? "text-emerald-800" : "text-red-700"}`}>
          <span className="block text-xs font-semibold uppercase tracking-wide">{positivo ? "Lucro" : "Prejuízo"}</span>
          <span className="text-2xl font-extrabold tabular-nums">{formatarMoeda(c.lucro)}</span>
          <span className="ml-2 font-bold">{formatarMargem(c.margem)}</span>
        </p>
      </div>
    </div>
  );
}
