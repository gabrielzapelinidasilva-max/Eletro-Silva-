"use client";

import { useActionState, useEffect, useState } from "react";
import { Camera, ChevronDown, Coffee, LogIn, LogOut, MapPin, Clock, Play } from "lucide-react";
import { alternarIntervalo, registrarChegada, registrarSaida } from "./actions";
import { CampoHoraAtual, HoraAutomatica } from "@/components/registros/CampoHora";
import { CamposGastosRegistro } from "@/components/registros/CamposGastosRegistro";
import { FotosServico } from "@/components/registros/FotosServico";
import { AssinaturaCliente } from "@/components/registros/AssinaturaCliente";
import { CompartilharLocalizacao } from "@/components/registros/CompartilharLocalizacao";
import { Campo, AreaTexto } from "@/components/ui/Campo";
import { BotaoEnviar } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData, formatarHora, horaAgoraSP } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import { RESULTADO_INICIAL, type Registro, type Resultado, type VeiculoOpcao } from "@/lib/tipos";

/** Cartão principal: "Registrar chegada" ou, se já chegou, "Registrar saída". */
export function PainelPonto({ aberto, hoje, horaAgora, veiculos, usuarioId, clienteSugerido = "", ajustarHoras = false }: { aberto: Registro | null; hoje: string; horaAgora: string; veiculos: VeiculoOpcao[]; usuarioId: string; clienteSugerido?: string; /** Encarregado/admin escolhem a hora. */ ajustarHoras?: boolean }) {
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
    <FormSaida key={aberto.id} ajustarHoras={ajustarHoras} registro={aberto} horaAgora={horaAgora} estado={estadoSaida} enviar={enviarSaida} veiculos={veiculos} usuarioId={usuarioId} />
  ) : (
    <FormChegada key={clienteSugerido} ajustarHoras={ajustarHoras} horaAgora={horaAgora} hoje={hoje} estado={estadoChegada} enviar={enviarChegada} clienteSugerido={clienteSugerido} />
  );
}

type PropsForm = { horaAgora: string; estado: Resultado; enviar: (form: FormData) => void; ajustarHoras: boolean };

function FormChegada({ horaAgora, hoje, estado, enviar, clienteSugerido, ajustarHoras }: PropsForm & { hoje: string; clienteSugerido: string }) {
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
          {ajustarHoras
            ? <CampoHoraAtual nome="hora_chegada" rotulo="Hora de chegada" horaInicial={horaAgora} erro={e.hora_chegada} />
            : <HoraAutomatica rotulo="Hora de chegada" horaInicial={horaAgora} />}
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

function FormSaida({ registro, horaAgora, estado, enviar, veiculos, usuarioId, ajustarHoras }: PropsForm & { registro: Registro; veiculos: VeiculoOpcao[]; usuarioId: string }) {
  const e = estado.erros ?? {};
  // Fotos/assinatura sendo enviadas: não deixa registrar a saída antes de terminar.
  const [envios, setEnvios] = useState<Record<string, boolean>>({});
  const enviando = Object.values(envios).some(Boolean);
  const marcarEnvio = (parte: string) => (sim: boolean) => setEnvios((x) => ({ ...x, [parte]: sim }));

  const emIntervalo = !!registro.intervalo_inicio;

  return (
    <Cartao className={`ring-2 ${emIntervalo ? "ring-amber-300" : "ring-emerald-300"}`}>
      <BlocoIntervalo registro={registro} />
      <form action={enviar} className="mt-4 space-y-4" noValidate>
        <input type="hidden" name="id" value={registro.id} />
        {ajustarHoras
          ? <CampoHoraAtual nome="hora_saida" rotulo="Hora de saída" horaInicial={horaAgora} erro={e.hora_saida} />
          : <HoraAutomatica rotulo="Hora de saída" horaInicial={horaAgora} />}
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

/** Minutos entre duas horas "HH:MM[:SS]" do mesmo dia. */
function minutosEntreHoras(de: string, ate: string) {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return Math.max(0, m(ate) - m(de));
}

/**
 * Situação do atendimento com o cronômetro (horas trabalhadas, sem os intervalos)
 * e o botão de intervalo: pausa o cronômetro e depois volta.
 */
function BlocoIntervalo({ registro }: { registro: Registro }) {
  const [estado, enviar] = useActionState(alternarIntervalo, RESULTADO_INICIAL);
  useToastDoResultado(estado);
  const [agora, setAgora] = useState(() => horaAgoraSP());
  useEffect(() => {
    const t = setInterval(() => setAgora(horaAgoraSP()), 15_000);
    return () => clearInterval(t);
  }, []);

  const emIntervalo = !!registro.intervalo_inicio;
  const fimDaConta = emIntervalo ? registro.intervalo_inicio! : agora;
  const trabalhados = Math.max(0, minutosEntreHoras(registro.hora_chegada, fimDaConta) - (registro.minutos_intervalo ?? 0));
  const pausa = (registro.minutos_intervalo ?? 0) + (emIntervalo ? minutosEntreHoras(registro.intervalo_inicio!, agora) : 0);

  return (
    <div className={`rounded-xl p-4 ${emIntervalo ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
      <div className="flex items-start gap-3">
        <span className="relative mt-1.5 flex size-3 shrink-0">
          {!emIntervalo && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
          <span className={`relative inline-flex size-3 rounded-full ${emIntervalo ? "bg-amber-500" : "bg-emerald-500"}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {emIntervalo ? `Em intervalo desde ${formatarHora(registro.intervalo_inicio)}` : `Trabalhando desde ${formatarHora(registro.hora_chegada)}`}
          </p>
          <p className="text-sm">Cliente: {registro.cliente}</p>
        </div>
        <div className="text-right" aria-live="polite">
          <p className="text-2xl font-extrabold tabular-nums">{formatarMinutos(trabalhados)}</p>
          <p className="text-xs">{emIntervalo ? "pausado" : "trabalhadas"}</p>
        </div>
      </div>
      {pausa > 0 && <p className="mt-2 text-xs">Intervalo{emIntervalo ? "" : "s"} hoje neste atendimento: {formatarMinutos(pausa)}</p>}
      <form action={enviar} className="mt-3">
        <input type="hidden" name="id" value={registro.id} />
        {emIntervalo ? (
          <BotaoEnviar tamanho="lg" className="w-full" textoCarregando="Voltando...">
            <Play className="size-5" aria-hidden /> Voltar do intervalo
          </BotaoEnviar>
        ) : (
          <BotaoEnviar variante="secundario" tamanho="lg" className="w-full" textoCarregando="Pausando...">
            <Coffee className="size-5" aria-hidden /> Intervalo (pausar)
          </BotaoEnviar>
        )}
      </form>
    </div>
  );
}
