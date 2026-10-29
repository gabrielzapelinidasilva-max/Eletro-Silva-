"use client";

import { useActionState, useState } from "react";
import { Camera, ChevronDown, LogIn, LogOut, MapPin, Clock } from "lucide-react";
import { registrarChegada, registrarSaida } from "./actions";
import { HoraAutomatica } from "@/components/registros/CampoHora";
import { CamposGastosRegistro } from "@/components/registros/CamposGastosRegistro";
import { FotosServico } from "@/components/registros/FotosServico";
import { AssinaturaCliente } from "@/components/registros/AssinaturaCliente";
import { CompartilharLocalizacao } from "@/components/registros/CompartilharLocalizacao";
import { Campo, AreaTexto } from "@/components/ui/Campo";
import { BotaoEnviar } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData, formatarHora } from "@/lib/datas";
import { RESULTADO_INICIAL, type Registro, type Resultado, type VeiculoOpcao } from "@/lib/tipos";

/** Cartão principal: "Registrar chegada" ou, se já chegou, "Registrar saída". */
export function PainelPonto({ aberto, hoje, horaAgora, veiculos, usuarioId, clienteSugerido = "" }: { aberto: Registro | null; hoje: string; horaAgora: string; veiculos: VeiculoOpcao[]; usuarioId: string; clienteSugerido?: string }) {
  // Os estados ficam aqui (e não nos formulários) porque, ao salvar, um formulário
  // troca pelo outro; assim o aviso de sucesso não se perde.
  const [estadoChegada, enviarChegada] = useActionState(registrarChegada, RESULTADO_INICIAL);
  const [estadoSaida, enviarSaida] = useActionState(registrarSaida, RESULTADO_INICIAL);
  useToastDoResultado(estadoChegada);
  useToastDoResultado(estadoSaida);

  if (aberto && aberto.data !== hoje) {
    return (
      <Cartao className="border-l-4 border-amber-400">
        <h2 className="text-lg font-bold text-slate-900">Registro em aberto</h2>
        <p className="mt-2 text-slate-600">
          Você registrou chegada em <strong>{formatarData(aberto.data)}</strong> às <strong>{formatarHora(aberto.hora_chegada)}</strong>{" "}
          ({aberto.cliente}) e não registrou a saída.
        </p>
        <p className="mt-2 text-slate-600">Peça ao administrador para corrigir esse registro. Depois disso você poderá registrar novas chegadas.</p>
      </Cartao>
    );
  }
  return aberto ? (
    <FormSaida key={aberto.id} registro={aberto} horaAgora={horaAgora} estado={estadoSaida} enviar={enviarSaida} veiculos={veiculos} usuarioId={usuarioId} />
  ) : (
    <FormChegada key={clienteSugerido} horaAgora={horaAgora} hoje={hoje} estado={estadoChegada} enviar={enviarChegada} clienteSugerido={clienteSugerido} />
  );
}

type PropsForm = { horaAgora: string; estado: Resultado; enviar: (form: FormData) => void };

function FormChegada({ horaAgora, hoje, estado, enviar, clienteSugerido }: PropsForm & { hoje: string; clienteSugerido: string }) {
  const e = estado.erros ?? {};

  return (
    <div id="chegada" className="scroll-mt-24">
    <Cartao>
      <form action={enviar} className="space-y-4" noValidate>
        <div className="flex items-center gap-2 text-slate-900">
          <MapPin className="size-5 text-marca-600" aria-hidden />
          <h2 className="text-lg font-bold">Novo atendimento</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data" value={formatarData(hoje)} readOnly disabled />
          <HoraAutomatica rotulo="Hora de chegada" horaInicial={horaAgora} />
        </div>
        <Campo rotulo="Cliente" name="cliente" placeholder="Nome do cliente ou local" defaultValue={estado.valores?.cliente ?? clienteSugerido} erro={e.cliente} obrigatorio maxLength={200} autoComplete="off" />
        <BotaoEnviar tamanho="xl" className="w-full" textoCarregando="Registrando...">
          <LogIn className="size-6" aria-hidden />
          Registrar chegada
        </BotaoEnviar>
      </form>
    </Cartao>
    </div>
  );
}

function FormSaida({ registro, horaAgora, estado, enviar, veiculos, usuarioId }: PropsForm & { registro: Registro; veiculos: VeiculoOpcao[]; usuarioId: string }) {
  const e = estado.erros ?? {};
  // Fotos/assinatura sendo enviadas: não deixa registrar a saída antes de terminar.
  const [envios, setEnvios] = useState<Record<string, boolean>>({});
  const enviando = Object.values(envios).some(Boolean);
  const marcarEnvio = (parte: string) => (sim: boolean) => setEnvios((x) => ({ ...x, [parte]: sim }));

  return (
    <Cartao className="ring-2 ring-emerald-300">
      <form action={enviar} className="space-y-4" noValidate>
        <input type="hidden" name="id" value={registro.id} />
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          <span className="relative mt-1.5 flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="font-bold">Trabalhando desde {formatarHora(registro.hora_chegada)}</p>
            <p className="text-sm">Cliente: {registro.cliente}</p>
          </div>
        </div>
        <HoraAutomatica rotulo="Hora de saída" horaInicial={horaAgora} />
        <Campo rotulo="Cliente" name="cliente" defaultValue={estado.valores?.cliente ?? registro.cliente} erro={e.cliente} obrigatorio maxLength={200} />
        <AreaTexto rotulo="Serviço realizado" name="servico" defaultValue={estado.valores?.servico} placeholder="Ex.: Troca de disjuntor e revisão do quadro" erro={e.servico} obrigatorio maxLength={2000} />
        <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={estado.valores?.observacoes} placeholder="Materiais usados, pendências, recados..." erro={e.observacoes} rows={4} maxLength={5000} />
        <CamposGastosRegistro veiculos={veiculos} inicial={registro} digitado={estado.valores} erros={e} />
        <details className="group rounded-xl border border-slate-200 p-4 open:pb-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-marca-700">
            <span className="flex items-center gap-1.5"><Camera className="size-4" aria-hidden /> Fotos e assinatura do cliente (opcional)</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-4 space-y-5">
            <FotosServico nome="fotos_antes" rotulo="Fotos do antes" usuarioId={usuarioId} registroId={registro.id} aoMudarEnvio={marcarEnvio("antes")} />
            <FotosServico nome="fotos_depois" rotulo="Fotos do depois" usuarioId={usuarioId} registroId={registro.id} aoMudarEnvio={marcarEnvio("depois")} />
            <AssinaturaCliente usuarioId={usuarioId} registroId={registro.id} aoMudarEnvio={marcarEnvio("assinatura")} />
          </div>
        </details>
        {enviando && <input type="hidden" name="enviando" value="1" />}
        <BotaoEnviar variante="sucesso" tamanho="xl" className="w-full" textoCarregando="Registrando..." disabled={enviando}>
          <LogOut className="size-6" aria-hidden />
          Registrar saída
        </BotaoEnviar>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" aria-hidden /> {enviando ? "Aguarde terminar de enviar as fotos/assinatura." : `A saída não pode ser antes de ${formatarHora(registro.hora_chegada)}.`}
        </p>
        <CompartilharLocalizacao usuarioId={usuarioId} registroId={registro.id} />
      </form>
    </Cartao>
  );
}
