"use client";

import { useActionState, useState } from "react";
import { FilePlus2, Save } from "lucide-react";
import { adminCriarRegistro } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { CampoHora } from "@/components/registros/CampoHora";
import { CamposGastosRegistro } from "@/components/registros/CamposGastosRegistro";
import { CampoCliente } from "@/components/CampoCliente";
import { useToastDoResultado } from "@/components/ui/Toast";
import type { Cliente } from "@/lib/clientes";
import { RESULTADO_INICIAL, type VeiculoOpcao } from "@/lib/tipos";

type Props = { colaboradores: { id: string; nome: string }[]; veiculos: VeiculoOpcao[]; clientes: Cliente[]; hoje: string };

/** Botão "Nota avulsa": o administrador lança um serviço feito (qualquer colaborador e data). */
export function NovaNota(props: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Botao onClick={() => setAberto(true)}><FilePlus2 className="size-4" aria-hidden /> Nota avulsa</Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Nova nota avulsa" largura="lg">
        {aberto && <FormNota {...props} aoConcluir={() => setAberto(false)} />}
      </Modal>
    </>
  );
}

function FormNota({ colaboradores, veiculos, clientes, hoje, aoConcluir }: Props & { aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(adminCriarRegistro, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const v = (c: string, o = "") => estado.valores?.[c] ?? o;
  return (
    <form action={enviar} className="space-y-4" noValidate>
      <p className="text-sm text-slate-600">Para lançar um serviço que não foi registrado pelo celular. Entra nos Registros, no Histórico e em Gastos, como os outros.</p>
      <Selecao rotulo="Colaborador" name="usuario_id" defaultValue={v("usuario_id")} erro={e.usuario_id} obrigatorio>
        <option value="">— Escolha —</option>
        {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </Selecao>
      <div className="grid grid-cols-3 gap-3">
        <Campo rotulo="Data" name="data" type="date" defaultValue={v("data", hoje)} erro={e.data} obrigatorio />
        <CampoHora rotulo="Chegada" name="hora_chegada" defaultValue={v("hora_chegada")} erro={e.hora_chegada} obrigatorio />
        <CampoHora rotulo="Saída" name="hora_saida" defaultValue={v("hora_saida")} erro={e.hora_saida} obrigatorio />
      </div>
      <Campo rotulo="Intervalo (minutos)" name="minutos_intervalo" type="number" inputMode="numeric" min={0} max={1440} defaultValue={v("minutos_intervalo", "0")} erro={e.minutos_intervalo} ajuda="Ex.: 60 para 1 hora de almoço. É descontado das horas." />
      <CampoCliente clientes={clientes} valorInicial={v("cliente")} erro={e.cliente} />
      <AreaTexto rotulo="Serviço realizado" name="servico" defaultValue={v("servico")} erro={e.servico} obrigatorio maxLength={2000} />
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v("observacoes")} rows={3} maxLength={5000} />
      <CamposGastosRegistro veiculos={veiculos} digitado={estado.valores} erros={e} mostrarValores />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> Lançar nota</BotaoEnviar>
      </div>
    </form>
  );
}
