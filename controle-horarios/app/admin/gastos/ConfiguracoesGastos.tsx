"use client";

import { useActionState, useState } from "react";
import { Car, EyeOff, Eye, Pencil, Plus, Save, Settings } from "lucide-react";
import { alterarVeiculoAtivo, salvarConfiguracoes, salvarVeiculo } from "./actions";
import { Cartao, TituloSecao } from "@/components/ui/Cartao";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarMoeda, formatarNumero, paraCampo, type Configuracoes, type Veiculo } from "@/lib/gastos";
import { RESULTADO_INICIAL } from "@/lib/tipos";

/** Valores que o administrador edita dentro do app: preço da gasolina, valor da hora e carros. */
export function ConfiguracoesGastos({ config, veiculos }: { config: Configuracoes; veiculos: Veiculo[] }) {
  const [estado, enviar] = useActionState(salvarConfiguracoes, RESULTADO_INICIAL);
  useToastDoResultado(estado);
  const [estadoAtivo, enviarAtivo] = useActionState(alterarVeiculoAtivo, RESULTADO_INICIAL);
  useToastDoResultado(estadoAtivo);
  const [editando, setEditando] = useState<Veiculo | "novo" | null>(null);
  const e = estado.erros ?? {};

  return (
    <Cartao>
      <TituloSecao>
        <span className="flex items-center gap-2"><Settings className="size-5 text-marca-600" aria-hidden /> Valores usados nas contas</span>
      </TituloSecao>

      <form action={enviar} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <Campo
          rotulo="Preço da gasolina (R$ por litro)"
          name="preco_gasolina"
          inputMode="decimal"
          defaultValue={estado.valores?.preco_gasolina ?? paraCampo(config.preco_gasolina, 3)}
          erro={e.preco_gasolina}
          ajuda={`Atual: ${formatarMoeda(config.preco_gasolina)}`}
          obrigatorio
        />
        <Campo
          rotulo="Valor da hora do eletricista (R$)"
          name="valor_hora_padrao"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={estado.valores?.valor_hora_padrao ?? paraCampo(config.valor_hora_padrao)}
          erro={e.valor_hora_padrao}
          ajuda="Usado nos serviços que os eletricistas registrarem a partir de agora (e nos avulsos)."
        />
        <BotaoEnviar className="sm:mb-6" textoCarregando="Salvando...">
          <Save className="size-5" aria-hidden /> Salvar valores
        </BotaoEnviar>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Car className="size-5 text-marca-600" aria-hidden /> Carros e consumo</h3>
          <Botao variante="secundario" onClick={() => setEditando("novo")}><Plus className="size-4" aria-hidden /> Adicionar carro</Botao>
        </div>
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {veiculos.map((c) => (
            <li key={c.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${c.ativo ? "" : "bg-slate-50"}`}>
              <div>
                <p className={`font-semibold ${c.ativo ? "text-slate-900" : "text-slate-400 line-through"}`}>{c.nome}</p>
                <p className="text-sm text-slate-500">{formatarNumero(c.consumo_km_l)} km por litro</p>
              </div>
              <div className="flex items-center gap-1">
                {!c.ativo && <Selo cor="cinza">Fora da lista</Selo>}
                <Botao variante="fantasma" className="px-3" onClick={() => setEditando(c)} aria-label={`Editar ${c.nome}`}><Pencil className="size-4" aria-hidden /> Editar</Botao>
                <form action={enviarAtivo}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativo" value={String(!c.ativo)} />
                  <BotaoEnviar variante={c.ativo ? "perigoSuave" : "sucessoSuave"} className="px-3" aria-label={c.ativo ? `Tirar ${c.nome} da lista` : `Voltar ${c.nome} para a lista`}>
                    {c.ativo ? <><EyeOff className="size-4" aria-hidden /> Tirar</> : <><Eye className="size-4" aria-hidden /> Voltar</>}
                  </BotaoEnviar>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Mudar o consumo ou o preço da gasolina vale para os próximos lançamentos; os já salvos guardam os valores do dia.
        </p>
      </div>

      <Modal aberto={editando !== null} aoFechar={() => setEditando(null)} titulo={editando === "novo" ? "Adicionar carro" : "Editar carro"} largura="sm">
        {editando !== null && <FormVeiculo key={editando === "novo" ? "novo" : editando.id} veiculo={editando === "novo" ? undefined : editando} aoConcluir={() => setEditando(null)} />}
      </Modal>
    </Cartao>
  );
}

function FormVeiculo({ veiculo, aoConcluir }: { veiculo?: Veiculo; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(salvarVeiculo, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {veiculo && <input type="hidden" name="id" value={veiculo.id} />}
      <Campo rotulo="Nome do carro" name="nome" placeholder="Ex.: Strada prata" defaultValue={estado.valores?.nome ?? veiculo?.nome} erro={e.nome} obrigatorio maxLength={60} />
      <Campo rotulo="Consumo (km por litro)" name="consumo_km_l" inputMode="decimal" placeholder="Ex.: 11" defaultValue={estado.valores?.consumo_km_l ?? paraCampo(veiculo?.consumo_km_l)} erro={e.consumo_km_l} obrigatorio />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
