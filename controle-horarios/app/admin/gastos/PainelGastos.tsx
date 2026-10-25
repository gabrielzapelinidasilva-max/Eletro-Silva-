"use client";

import { useActionState, useMemo, useState } from "react";
import { Fuel, HandCoins, Package, Pencil, Plus, Save, Trash2, Wrench } from "lucide-react";
import { excluirLancamento, salvarLancamento } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { EstadoVazio } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import {
  calcular, formatarMargem, formatarMoeda, formatarNumero, lerHoras, lerNumero, paraCampo,
  type Calculo, type Configuracoes, type LancamentoCusto, type TrabalhoParaCusto, type Veiculo,
} from "@/lib/gastos";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Props = {
  lancamentos: LancamentoCusto[];
  veiculos: Veiculo[];
  config: Configuracoes;
  trabalhos: TrabalhoParaCusto[];
  jaLancados: string[];
  hoje: string;
};

type Janela = { tipo: "novo" } | { tipo: "editar" | "excluir"; lancamento: LancamentoCusto } | null;

export function PainelGastos({ lancamentos, veiculos, config, trabalhos, jaLancados, hoje }: Props) {
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [estadoExclusao, excluir] = useActionState(excluirLancamento, RESULTADO_INICIAL);
  useToastDoResultado(estadoExclusao, fechar);

  return (
    <section aria-label="Lançamentos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Serviços lançados</h2>
        <Botao tamanho="lg" onClick={() => setJanela({ tipo: "novo" })}>
          <Plus className="size-5" aria-hidden /> Lançar gastos de um serviço
        </Botao>
      </div>

      {lancamentos.length === 0 ? (
        <EstadoVazio titulo="Nenhum serviço lançado neste período" texto="Toque em “Lançar gastos de um serviço” para registrar material, gasolina, mão de obra e o valor cobrado." />
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

      <Modal aberto={janela?.tipo === "novo" || janela?.tipo === "editar"} aoFechar={fechar} titulo={janela?.tipo === "editar" ? "Editar lançamento" : "Lançar gastos de um serviço"} largura="lg">
        {(janela?.tipo === "novo" || janela?.tipo === "editar") && (
          <FormLancamento
            key={janela.tipo === "editar" ? janela.lancamento.id : "novo"}
            lancamento={janela.tipo === "editar" ? janela.lancamento : undefined}
            veiculos={veiculos}
            config={config}
            trabalhos={trabalhos.filter((t) => !jaLancados.includes(t.id) || (janela.tipo === "editar" && janela.lancamento.registro_id === t.id))}
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
              Os gastos do serviço <strong>{janela.lancamento.cliente}</strong> ({formatarData(janela.lancamento.data)}) serão excluídos. O registro de horário do eletricista não é apagado.
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
  return (
    <li className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{l.cliente}</p>
          <p className="text-xs text-slate-500">
            {formatarData(l.data)}
            {l.veiculo_nome && ` · ${l.veiculo_nome}, ${formatarNumero(l.km_rodados, 1)} km`}
            {l.horas > 0 && ` · ${formatarMinutos(Math.round(l.horas * 60))}`}
          </p>
          {l.descricao && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{l.descricao}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-extrabold tabular-nums ${positivo ? "text-emerald-700" : "text-red-600"}`}>{formatarMoeda(c.lucro)}</p>
          <p className={`text-xs font-bold ${positivo ? "text-emerald-700" : "text-red-600"}`}>{formatarMargem(c.margem)} de lucro</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm sm:grid-cols-3">
        <Linha rotulo="Material" valor={l.valor_material} />
        <Linha rotulo="Gasolina" valor={c.custoGasolina} />
        <Linha rotulo="Mão de obra" valor={c.custoMaoDeObra} />
        <Linha rotulo="Custo total" valor={c.custoTotal} forte />
        <Linha rotulo="Valor cobrado" valor={l.valor_servico} forte />
      </dl>
      <div className="mt-3 flex justify-end gap-2">
        <Botao variante="fantasma" onClick={aoEditar}><Pencil className="size-4" aria-hidden /> Editar</Botao>
        <Botao variante="perigoSuave" onClick={aoExcluir}><Trash2 className="size-4" aria-hidden /> Excluir</Botao>
      </div>
    </li>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className={`tabular-nums ${forte ? "font-bold text-slate-900" : "text-slate-700"}`}>{formatarMoeda(valor)}</dd>
    </div>
  );
}

type PropsForm = {
  lancamento?: LancamentoCusto;
  veiculos: Veiculo[];
  config: Configuracoes;
  trabalhos: TrabalhoParaCusto[];
  hoje: string;
  aoConcluir: () => void;
};

/** Formulário do lançamento, com a conta do lucro sendo feita enquanto se digita. */
function FormLancamento({ lancamento: l, veiculos, config, trabalhos, hoje, aoConcluir }: PropsForm) {
  const [estado, enviar] = useActionState(salvarLancamento, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  // Campos mexidos depois do último envio não mostram mais o erro antigo.
  const [mexidos, setMexidos] = useState<{ em?: number; campos: string[] }>({ campos: [] });
  const camposMexidos = mexidos.em === estado.em ? mexidos.campos : [];
  const marcar = (campo: string) => setMexidos({ em: estado.em, campos: [...camposMexidos, campo] });
  const e = Object.fromEntries(Object.entries(estado.erros ?? {}).filter(([k]) => !camposMexidos.includes(k)));

  const [v, setV] = useState({
    registro_id: l?.registro_id ?? "",
    data: l?.data ?? hoje,
    cliente: l?.cliente ?? "",
    descricao: l?.descricao ?? "",
    valor_material: paraCampo(l?.valor_material),
    veiculo_id: l?.veiculo_id ?? "",
    km_rodados: paraCampo(l?.km_rodados, 1),
    preco_gasolina: paraCampo(l ? l.preco_gasolina : config.preco_gasolina, 3),
    horas: paraCampo(l?.horas),
    valor_hora: paraCampo(l ? l.valor_hora : config.valor_hora_padrao),
    valor_servico: paraCampo(l?.valor_servico),
  });
  const mudar = (campo: keyof typeof v) => (ev: { target: { value: string } }) => {
    setV((s) => ({ ...s, [campo]: ev.target.value }));
    marcar(campo);
  };

  // Carros na lista: os ativos + o carro já usado neste lançamento (mesmo que desativado).
  const carros = veiculos.filter((c) => c.ativo || c.id === l?.veiculo_id);
  const carro = veiculos.find((c) => c.id === v.veiculo_id) ?? null;

  const escolherTrabalho = (id: string) => {
    const t = trabalhos.find((x) => x.id === id);
    setMexidos({ em: estado.em, campos: [...camposMexidos, "registro_id", "data", "cliente", "horas"] });
    setV((s) => ({
      ...s,
      registro_id: id,
      ...(t && {
        data: t.data,
        cliente: t.cliente,
        descricao: s.descricao || t.servico || "",
        horas: t.minutos ? paraCampo(Math.round((t.minutos / 60) * 100) / 100) : s.horas,
      }),
    }));
  };

  const calculo = useMemo(
    () =>
      calcular({
        valor_material: lerNumero(v.valor_material) ?? 0,
        km_rodados: lerNumero(v.km_rodados) ?? 0,
        consumo_km_l: carro?.consumo_km_l ?? null,
        preco_gasolina: lerNumero(v.preco_gasolina) ?? 0,
        horas: lerHoras(v.horas) ?? 0,
        valor_hora: lerNumero(v.valor_hora) ?? 0,
        valor_servico: lerNumero(v.valor_servico) ?? 0,
      }),
    [v, carro],
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {l && <input type="hidden" name="id" value={l.id} />}

      <Selecao rotulo="Trabalho registrado (opcional)" name="registro_id" value={v.registro_id} onChange={(ev) => escolherTrabalho(ev.target.value)} erro={e.registro_id}
        ajuda="Escolha um atendimento feito pelos eletricistas para puxar cliente, data e horas.">
        <option value="">— Lançar sem ligar a um trabalho —</option>
        {trabalhos.map((t) => (
          <option key={t.id} value={t.id}>
            {formatarData(t.data)} · {t.cliente} · {t.colaborador}{t.minutos ? ` · ${formatarMinutos(t.minutos)}` : ""}
          </option>
        ))}
      </Selecao>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Campo rotulo="Data" name="data" type="date" value={v.data} onChange={mudar("data")} erro={e.data} obrigatorio />
        <Campo rotulo="Cliente" name="cliente" value={v.cliente} onChange={mudar("cliente")} erro={e.cliente} obrigatorio maxLength={200} />
      </div>
      <AreaTexto rotulo="Descrição do serviço (opcional)" name="descricao" value={v.descricao} onChange={mudar("descricao")} erro={e.descricao} rows={2} maxLength={2000} />

      <Grupo icone={<Package className="size-4" aria-hidden />} titulo="Material">
        <CampoDinheiro rotulo="Valor do material levado" name="valor_material" value={v.valor_material} onChange={mudar("valor_material")} erro={e.valor_material} />
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
        {carro && calculo.litros > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {formatarNumero(lerNumero(v.km_rodados) ?? 0, 1)} km ÷ {formatarNumero(carro.consumo_km_l)} km/l = {formatarNumero(calculo.litros)} litros × {formatarMoeda(lerNumero(v.preco_gasolina) ?? 0)} = <strong>{formatarMoeda(calculo.custoGasolina)}</strong>
          </p>
        )}
      </Grupo>

      <Grupo icone={<Wrench className="size-4" aria-hidden />} titulo="Mão de obra do eletricista">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Horas trabalhadas" name="horas" inputMode="decimal" placeholder="Ex.: 3,5 ou 3:30" value={v.horas} onChange={mudar("horas")} erro={e.horas} />
          <CampoDinheiro rotulo="Valor da hora" name="valor_hora" value={v.valor_hora} onChange={mudar("valor_hora")} erro={e.valor_hora} />
        </div>
      </Grupo>

      <Grupo icone={<HandCoins className="size-4" aria-hidden />} titulo="Valor cobrado">
        <CampoDinheiro rotulo="Valor do serviço (cobrado do cliente)" name="valor_servico" value={v.valor_servico} onChange={mudar("valor_servico")} erro={e.valor_servico} obrigatorio />
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

function CampoDinheiro(props: React.ComponentProps<typeof Campo>) {
  return (
    <div className="relative">
      <Campo inputMode="decimal" placeholder="0,00" autoComplete="off" className="pl-10 tabular-nums" {...props} />
      <span className="pointer-events-none absolute left-3.5 top-[38px] text-sm font-semibold text-slate-400">R$</span>
    </div>
  );
}

function Resumo({ calculo: c, material, valorServico }: { calculo: Calculo; material: number; valorServico: number }) {
  const positivo = c.lucro >= 0;
  return (
    <div className={`rounded-xl p-4 ring-1 ${positivo ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`} aria-live="polite">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Material</dt><dd className="tabular-nums">{formatarMoeda(material)}</dd></div>
        <div><dt className="text-xs text-slate-500">Gasolina</dt><dd className="tabular-nums">{formatarMoeda(c.custoGasolina)}</dd></div>
        <div><dt className="text-xs text-slate-500">Mão de obra</dt><dd className="tabular-nums">{formatarMoeda(c.custoMaoDeObra)}</dd></div>
        <div><dt className="text-xs text-slate-500">Custo total</dt><dd className="font-bold tabular-nums">{formatarMoeda(c.custoTotal)}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-black/10 pt-3">
        <p className="text-sm text-slate-600">Cobrado: <strong className="tabular-nums">{formatarMoeda(valorServico)}</strong></p>
        <p className={`text-right ${positivo ? "text-emerald-800" : "text-red-700"}`}>
          <span className="block text-xs font-semibold uppercase tracking-wide">{positivo ? "Lucro" : "Prejuízo"}</span>
          <span className="text-2xl font-extrabold tabular-nums">{formatarMoeda(c.lucro)}</span>
          <span className="ml-2 font-bold">{formatarMargem(c.margem)}</span>
        </p>
      </div>
    </div>
  );
}
