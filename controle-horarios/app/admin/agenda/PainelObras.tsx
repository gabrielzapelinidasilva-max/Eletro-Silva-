"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarPlus, CheckCircle2, ChevronDown, Clock, HardHat, MapPin, Pencil, Phone, Plus, RotateCcw, Save, Trash2, Users, X } from "lucide-react";
import { adicionarDiasObra, alterarStatusObra, criarObra, editarObra, excluirObra, tirarDiaObra } from "./obras-actions";
import { EscolherDias } from "./EscolherDias";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { CampoHora } from "@/components/registros/CampoHora";
import { useToast, useToastDoResultado } from "@/components/ui/Toast";
import { dataPorExtenso, formatarData, formatarHora } from "@/lib/datas";
import { linkMapa, linkTelefone } from "@/lib/agenda";
import type { DiaObra, Obra } from "@/lib/obras";
import type { Cliente } from "@/lib/clientes";
import { CampoCliente } from "@/components/CampoCliente";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Pessoa = { id: string; nome: string };
type Janela = { tipo: "nova" } | { tipo: "editar" | "dias" | "excluir"; obra: Obra } | null;

export function PainelObras({ obras, dias, colaboradores, clientes, hoje }: { obras: Obra[]; dias: DiaObra[]; colaboradores: Pessoa[]; clientes: Cliente[]; hoje: string }) {
  const [janela, setJanela] = useState<Janela>(null);
  const [verConcluidas, setVerConcluidas] = useState(false);
  const fechar = () => setJanela(null);
  // Fica aqui (e não no cartão): ao concluir, o cartão sai da lista e o aviso não se perderia.
  const [estadoStatus, enviarStatus] = useActionState(alterarStatusObra, RESULTADO_INICIAL);
  useToastDoResultado(estadoStatus);
  const lista = obras.filter((o) => (verConcluidas ? o.status === "concluida" : o.status === "andamento"));
  const concluidas = obras.filter((o) => o.status === "concluida").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[false, true].map((c) => (
            <button key={String(c)} type="button" onClick={() => setVerConcluidas(c)} aria-pressed={verConcluidas === c}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${verConcluidas === c ? "bg-white text-marca-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500"}`}>
              {c ? `Concluídos (${concluidas})` : `Em andamento (${obras.length - concluidas})`}
            </button>
          ))}
        </div>
        <Botao onClick={() => setJanela({ tipo: "nova" })}><Plus className="size-4" aria-hidden /> Novo serviço em andamento</Botao>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          titulo={verConcluidas ? "Nenhum serviço concluído" : "Nenhum serviço em andamento"}
          texto={verConcluidas ? undefined : "Cadastre uma obra que dura vários dias, escolha os dias (ex.: segunda a sexta) e os eletricistas. Cada dia aparece na agenda e na tela do eletricista."}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.map((o) => (
            <CartaoObra key={o.id} obra={o} dias={dias.filter((d) => d.obra_id === o.id)} colaboradores={colaboradores} hoje={hoje} abrir={setJanela} enviarStatus={enviarStatus} />
          ))}
        </ul>
      )}

      <Modal aberto={janela?.tipo === "nova"} aoFechar={fechar} titulo="Novo serviço em andamento" largura="lg">
        {janela?.tipo === "nova" && <FormNova colaboradores={colaboradores} clientes={clientes} hoje={hoje} aoConcluir={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "editar"} aoFechar={fechar} titulo="Editar serviço" largura="lg">
        {janela?.tipo === "editar" && <FormEditar key={janela.obra.id} obra={janela.obra} clientes={clientes} aoConcluir={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "dias"} aoFechar={fechar} titulo="Adicionar dias" largura="lg">
        {janela?.tipo === "dias" && (
          <FormDias key={janela.obra.id} obra={janela.obra} colaboradores={colaboradores} hoje={hoje} aoConcluir={fechar}
            atuais={[...new Set(dias.filter((d) => d.obra_id === janela.obra.id && d.colaborador_id).map((d) => d.colaborador_id!))]} />
        )}
      </Modal>
      <ExcluirObra obra={janela?.tipo === "excluir" ? janela.obra : null} aoFechar={fechar} />
    </>
  );
}

type PropsCartao = { obra: Obra; dias: DiaObra[]; colaboradores: Pessoa[]; hoje: string; abrir: (j: Janela) => void; enviarStatus: (form: FormData) => void };

function CartaoObra({ obra, dias, colaboradores, hoje, abrir, enviarStatus }: PropsCartao) {
  const [aberto, setAberto] = useState(false);
  const [, iniciar] = useTransition();
  const toast = useToast();

  const nome = (id: string | null) => colaboradores.find((c) => c.id === id)?.nome.split(" ")[0] ?? "—";
  const validos = dias.filter((d) => d.status !== "cancelado");
  const datas = [...new Set(validos.map((d) => d.data))].sort();
  const feitos = datas.filter((d) => d < hoje).length;
  const proximo = datas.find((d) => d >= hoje);
  const equipe = [...new Set(validos.filter((d) => d.data >= hoje).map((d) => d.colaborador_id))].map(nome);
  const porcentagem = datas.length ? Math.round((feitos / datas.length) * 100) : 0;
  const concluida = obra.status === "concluida";

  function tirar(data: string) {
    iniciar(async () => {
      const r = await tirarDiaObra(obra.id, data);
      toast(r.ok ? "sucesso" : "erro", r.mensagem);
    });
  }

  return (
    <li className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-bold text-slate-900"><HardHat className="size-5 shrink-0 text-marca-600" aria-hidden /> <span className="truncate">{obra.cliente}</span></p>
          {obra.servico && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{obra.servico}</p>}
        </div>
        {concluida ? <Selo cor="verde">Concluído</Selo> : <Selo cor="azul">Em andamento</Selo>}
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {obra.endereco && <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-slate-400" aria-hidden /> <a href={linkMapa(obra.endereco)} target="_blank" rel="noopener" className="truncate text-marca-600 underline">{obra.endereco}</a></p>}
        {obra.telefone && <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-slate-400" aria-hidden /> <a href={linkTelefone(obra.telefone)} className="text-marca-600 underline">{obra.telefone}</a></p>}
        {obra.hora && <p className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-slate-400" aria-hidden /> Começa às {formatarHora(obra.hora)}</p>}
        {equipe.length > 0 && <p className="flex items-center gap-2"><Users className="size-4 shrink-0 text-slate-400" aria-hidden /> {equipe.join(", ")}</p>}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>{feitos} de {datas.length} {datas.length === 1 ? "dia" : "dias"}</span>
          <span>{proximo ? `Próximo: ${proximo === hoje ? "hoje" : formatarData(proximo)}` : "Sem dias futuros"}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={porcentagem} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-marca-600" style={{ width: `${porcentagem}%` }} />
        </div>
      </div>

      <button type="button" onClick={() => setAberto((x) => !x)} className="mt-3 flex items-center gap-1 self-start text-sm font-semibold text-marca-700" aria-expanded={aberto}>
        Ver os dias <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {aberto && (
        <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {datas.length === 0 && <li className="p-3 text-sm text-slate-500">Nenhum dia na agenda.</li>}
          {datas.map((d) => (
            <li key={d} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${d < hoje ? "text-slate-400" : "text-slate-700"}`}>
              <span>
                <span className="font-semibold">{dataPorExtenso(d)}</span>
                <span className="block text-xs">{validos.filter((x) => x.data === d).map((x) => nome(x.colaborador_id)).join(", ")}</span>
              </span>
              {d >= hoje && (
                <button type="button" onClick={() => tirar(d)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Tirar ${formatarData(d)}`} title="Tirar este dia">
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <Botao variante="secundario" onClick={() => abrir({ tipo: "dias", obra })}><CalendarPlus className="size-4" aria-hidden /> Adicionar dias</Botao>
        <Botao variante="secundario" onClick={() => abrir({ tipo: "editar", obra })}><Pencil className="size-4" aria-hidden /> Editar</Botao>
        <form action={enviarStatus}>
          <input type="hidden" name="id" value={obra.id} />
          <input type="hidden" name="status" value={concluida ? "andamento" : "concluida"} />
          <BotaoEnviar variante={concluida ? "secundario" : "sucessoSuave"} textoCarregando="Salvando...">
            {concluida ? <><RotateCcw className="size-4" aria-hidden /> Reabrir</> : <><CheckCircle2 className="size-4" aria-hidden /> Concluir</>}
          </BotaoEnviar>
        </form>
        <Botao variante="perigoSuave" onClick={() => abrir({ tipo: "excluir", obra })} aria-label={`Excluir ${obra.cliente}`}><Trash2 className="size-4" aria-hidden /></Botao>
      </div>
    </li>
  );
}

function CamposInfo({ obra, clientes, valores, erros }: { obra?: Obra; clientes: Cliente[]; valores?: Record<string, string>; erros: Record<string, string> }) {
  const v = (c: string, o: string) => valores?.[c] ?? o;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <CampoCliente clientes={clientes} rotulo="Cliente / obra" valorInicial={v("cliente", obra?.cliente ?? "")} erro={erros.cliente} placeholder="Ex.: Obra Residencial Silva" />
        <CampoHora rotulo="Hora (opcional)" name="hora" defaultValue={v("hora", obra?.hora ? formatarHora(obra.hora) : "")} erro={erros.hora} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Endereço (opcional)" name="endereco" defaultValue={v("endereco", obra?.endereco ?? "")} maxLength={300} />
        <Campo rotulo="Telefone (opcional)" name="telefone" type="tel" inputMode="tel" defaultValue={v("telefone", obra?.telefone ?? "")} maxLength={30} />
      </div>
      <AreaTexto rotulo="Serviço a fazer (opcional)" name="servico" defaultValue={v("servico", obra?.servico ?? "")} rows={2} maxLength={2000} />
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v("observacoes", obra?.observacoes ?? "")} rows={2} maxLength={2000} />
    </>
  );
}

function EscolherEletricistas({ colaboradores, marcados = [], erro }: { colaboradores: Pessoa[]; marcados?: string[]; erro?: string }) {
  // Controlado: a escolha continua marcada se o formulário voltar com erro.
  const [escolhidos, setEscolhidos] = useState(marcados);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Eletricistas <span className="text-red-600">*</span></legend>
      <div className="flex flex-wrap gap-2">
        {colaboradores.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 has-checked:bg-marca-50 has-checked:text-marca-900 has-checked:ring-marca-400">
            <input type="checkbox" name="colaboradores" value={c.id} checked={escolhidos.includes(c.id)} className="size-4 accent-marca-600"
              onChange={(ev) => setEscolhidos((l) => (ev.target.checked ? [...l, c.id] : l.filter((x) => x !== c.id)))} />
            {c.nome}
          </label>
        ))}
      </div>
      {erro && <p className="mt-1 text-sm font-medium text-red-600">{erro}</p>}
    </fieldset>
  );
}

function Rodape({ aoCancelar, texto }: { aoCancelar: () => void; texto: string }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
      <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> {texto}</BotaoEnviar>
    </div>
  );
}

function FormNova({ colaboradores, clientes, hoje, aoConcluir }: { colaboradores: Pessoa[]; clientes: Cliente[]; hoje: string; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(criarObra, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      <CamposInfo clientes={clientes} valores={estado.valores} erros={e} />
      <EscolherDias hoje={hoje} erro={e.datas} />
      <EscolherEletricistas colaboradores={colaboradores} erro={e.colaboradores} />
      <Rodape aoCancelar={aoConcluir} texto="Colocar na agenda" />
    </form>
  );
}

function FormEditar({ obra, clientes, aoConcluir }: { obra: Obra; clientes: Cliente[]; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(editarObra, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={obra.id} />
      <CamposInfo obra={obra} clientes={clientes} valores={estado.valores} erros={estado.erros ?? {}} />
      <p className="text-xs text-slate-500">As mudanças valem também para os próximos dias que já estão na agenda.</p>
      <Rodape aoCancelar={aoConcluir} texto="Salvar" />
    </form>
  );
}

function FormDias({ obra, colaboradores, atuais, hoje, aoConcluir }: { obra: Obra; colaboradores: Pessoa[]; atuais: string[]; hoje: string; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(adicionarDiasObra, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="obra_id" value={obra.id} />
      <p className="text-sm text-slate-600">Mais dias para <strong>{obra.cliente}</strong>. Dias que já estão na agenda para o mesmo eletricista não se repetem.</p>
      <EscolherDias hoje={hoje} erro={e.datas} />
      <EscolherEletricistas colaboradores={colaboradores} marcados={atuais} erro={e.colaboradores} />
      <Rodape aoCancelar={aoConcluir} texto="Adicionar à agenda" />
    </form>
  );
}

function ExcluirObra({ obra, aoFechar }: { obra: Obra | null; aoFechar: () => void }) {
  const [estado, excluir] = useActionState(excluirObra, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoFechar);
  return (
    <Modal aberto={!!obra} aoFechar={aoFechar} titulo="Excluir serviço?" largura="sm">
      {obra && (
        <form action={excluir} className="space-y-5">
          <input type="hidden" name="id" value={obra.id} />
          <p className="text-slate-600"><strong>{obra.cliente}</strong> e <strong>todos os dias dele</strong> saem da agenda (também da tela dos eletricistas). Os registros de horas já feitos continuam. Para só encerrar, use “Concluir”.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
            <BotaoEnviar variante="perigo" textoCarregando="Excluindo..."><Trash2 className="size-5" aria-hidden /> Sim, excluir</BotaoEnviar>
          </div>
        </form>
      )}
    </Modal>
  );
}
