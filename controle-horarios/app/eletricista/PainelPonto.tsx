"use client";

import { useActionState } from "react";
import { LogIn, LogOut, MapPin, Clock } from "lucide-react";
import { registrarChegada, registrarSaida } from "./actions";
import { CampoHoraAtual } from "@/components/registros/CampoHora";
import { CamposGastosRegistro } from "@/components/registros/CamposGastosRegistro";
import { Campo, AreaTexto } from "@/components/ui/Campo";
import { BotaoEnviar } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData, formatarHora } from "@/lib/datas";
import { RESULTADO_INICIAL, type Registro, type Resultado, type VeiculoOpcao } from "@/lib/tipos";

/** Cartão principal: "Registrar chegada" ou, se já chegou, "Registrar saída". */
export function PainelPonto({ aberto, hoje, horaAgora, veiculos }: { aberto: Registro | null; hoje: string; horaAgora: string; veiculos: VeiculoOpcao[] }) {
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
    <FormSaida key={aberto.id} registro={aberto} horaAgora={horaAgora} estado={estadoSaida} enviar={enviarSaida} veiculos={veiculos} />
  ) : (
    <FormChegada horaAgora={horaAgora} hoje={hoje} estado={estadoChegada} enviar={enviarChegada} />
  );
}

type PropsForm = { horaAgora: string; estado: Resultado; enviar: (form: FormData) => void };

function FormChegada({ horaAgora, hoje, estado, enviar }: PropsForm & { hoje: string }) {
  const e = estado.erros ?? {};

  return (
    <Cartao>
      <form action={enviar} className="space-y-4" noValidate>
        <div className="flex items-center gap-2 text-slate-900">
          <MapPin className="size-5 text-marca-600" aria-hidden />
          <h2 className="text-lg font-bold">Novo atendimento</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data" value={formatarData(hoje)} readOnly disabled />
          <CampoHoraAtual nome="hora_chegada" rotulo="Hora de chegada" horaInicial={horaAgora} erro={e.hora_chegada} />
        </div>
        <Campo rotulo="Cliente" name="cliente" placeholder="Nome do cliente ou local" defaultValue={estado.valores?.cliente} erro={e.cliente} obrigatorio maxLength={200} autoComplete="off" />
        <BotaoEnviar tamanho="xl" className="w-full" textoCarregando="Registrando...">
          <LogIn className="size-6" aria-hidden />
          Registrar chegada
        </BotaoEnviar>
      </form>
    </Cartao>
  );
}

function FormSaida({ registro, horaAgora, estado, enviar, veiculos }: PropsForm & { registro: Registro; veiculos: VeiculoOpcao[] }) {
  const e = estado.erros ?? {};

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
        <CampoHoraAtual nome="hora_saida" rotulo="Hora de saída" horaInicial={horaAgora} erro={e.hora_saida} />
        <Campo rotulo="Cliente" name="cliente" defaultValue={estado.valores?.cliente ?? registro.cliente} erro={e.cliente} obrigatorio maxLength={200} />
        <AreaTexto rotulo="Serviço realizado" name="servico" defaultValue={estado.valores?.servico} placeholder="Ex.: Troca de disjuntor e revisão do quadro" erro={e.servico} obrigatorio maxLength={2000} />
        <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={estado.valores?.observacoes} placeholder="Materiais usados, pendências, recados..." erro={e.observacoes} rows={4} maxLength={5000} />
        <CamposGastosRegistro veiculos={veiculos} inicial={registro} digitado={estado.valores} erros={e} />
        <BotaoEnviar variante="sucesso" tamanho="xl" className="w-full" textoCarregando="Registrando...">
          <LogOut className="size-6" aria-hidden />
          Registrar saída
        </BotaoEnviar>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" aria-hidden /> A saída não pode ser antes de {formatarHora(registro.hora_chegada)}.
        </p>
      </form>
    </Cartao>
  );
}
