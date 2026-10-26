"use client";

import { useActionState, useState } from "react";
import { Clock, RotateCcw, Trash2, User, Wallet } from "lucide-react";
import { esvaziarLixeira, excluirDeVez, restaurarItem } from "./actions";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { Modal } from "@/components/ui/Modal";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData, formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarMoeda } from "@/lib/gastos";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Json = Record<string, unknown> | null;

export type ItemLixeira = {
  id: string;
  tipo: "registro" | "lancamento";
  data: string | null;
  cliente: string | null;
  colaborador: string | null;
  excluido_em: string;
  excluido_por: string | null;
  registro: Json;
  lancamento: Json;
};

const texto = (j: Json, campo: string) => (j?.[campo] == null ? null : String(j[campo]));
const numero = (j: Json, campo: string) => (j?.[campo] == null ? null : Number(j[campo]));

export function ListaLixeira({ itens, dias }: { itens: ItemLixeira[]; dias: number }) {
  const [estadoRestaurar, restaurar] = useActionState(restaurarItem, RESULTADO_INICIAL);
  const [estadoExcluir, excluir] = useActionState(excluirDeVez, RESULTADO_INICIAL);
  const [estadoEsvaziar, esvaziar] = useActionState(esvaziarLixeira, RESULTADO_INICIAL);
  const [confirmar, setConfirmar] = useState<ItemLixeira | "tudo" | null>(null);
  const fechar = () => setConfirmar(null);
  useToastDoResultado(estadoRestaurar);
  useToastDoResultado(estadoExcluir, fechar);
  useToastDoResultado(estadoEsvaziar, fechar);

  if (itens.length === 0) {
    return <EstadoVazio titulo="A lixeira está vazia" texto="Quando você excluir um serviço ou lançamento, ele fica aqui para poder ser restaurado." />;
  }

  return (
    <>
      <div className="flex justify-end">
        <Botao variante="perigoSuave" onClick={() => setConfirmar("tudo")}>
          <Trash2 className="size-4" aria-hidden /> Esvaziar lixeira
        </Botao>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {itens.map((i) => {
          const r = i.registro;
          const l = i.lancamento;
          const expira = new Date(new Date(i.excluido_em).getTime() + dias * 86_400_000).toISOString();
          return (
            <li key={i.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{i.cliente ?? "—"}</p>
                  <p className="text-xs text-slate-500">{i.data ? formatarData(i.data) : "—"}</p>
                </div>
                <Selo cor={i.tipo === "registro" ? "azul" : "cinza"}>{i.tipo === "registro" ? "Serviço de eletricista" : "Lançamento avulso"}</Selo>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {i.colaborador && <p className="flex items-center gap-1.5"><User className="size-4 text-slate-400" aria-hidden /> {i.colaborador}</p>}
                {r && (
                  <p className="flex items-center gap-1.5 tabular-nums">
                    <Clock className="size-4 text-slate-400" aria-hidden />
                    {formatarHora(texto(r, "hora_chegada"))} – {r.hora_saida ? formatarHora(texto(r, "hora_saida")) : "em andamento"}
                  </p>
                )}
                {texto(r, "servico") && <p className="line-clamp-2">{texto(r, "servico")}</p>}
                {!r && texto(l, "descricao") && <p className="line-clamp-2">{texto(l, "descricao")}</p>}
                {l && (numero(l, "valor_servico") || numero(l, "valor_material")) ? (
                  <p className="flex items-center gap-1.5">
                    <Wallet className="size-4 text-slate-400" aria-hidden />
                    Cobrado {formatarMoeda(numero(l, "valor_servico") ?? 0)} · Material {formatarMoeda(numero(l, "valor_material") ?? 0)}
                  </p>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Excluído em {formatarDataHora(i.excluido_em)}{i.excluido_por ? ` por ${i.excluido_por}` : ""} · some de vez em {formatarData(expira.slice(0, 10))}
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <Botao variante="perigoSuave" onClick={() => setConfirmar(i)}>
                  <Trash2 className="size-4" aria-hidden /> Excluir de vez
                </Botao>
                <form action={restaurar}>
                  <input type="hidden" name="id" value={i.id} />
                  <BotaoEnviar variante="sucesso" textoCarregando="Restaurando...">
                    <RotateCcw className="size-4" aria-hidden /> Restaurar
                  </BotaoEnviar>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal aberto={confirmar !== null} aoFechar={fechar} titulo={confirmar === "tudo" ? "Esvaziar a lixeira?" : "Excluir de vez?"} largura="sm">
        {confirmar !== null && (
          <form action={confirmar === "tudo" ? esvaziar : excluir} className="space-y-5">
            {confirmar !== "tudo" && <input type="hidden" name="id" value={confirmar.id} />}
            <p className="text-slate-600">
              {confirmar === "tudo"
                ? `${itens.length === 1 ? "O item da lixeira será apagado" : `Todos os ${itens.length} itens da lixeira serão apagados`} para sempre. Não dá para desfazer.`
                : <>O item <strong>{confirmar.cliente}</strong> será apagado para sempre. Não dá para desfazer.</>}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
              <BotaoEnviar variante="perigo" textoCarregando="Excluindo...">
                <Trash2 className="size-5" aria-hidden /> {confirmar === "tudo" ? "Sim, esvaziar" : "Sim, excluir de vez"}
              </BotaoEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
