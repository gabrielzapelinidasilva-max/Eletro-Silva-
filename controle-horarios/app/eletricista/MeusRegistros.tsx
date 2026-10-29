"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Pencil } from "lucide-react";
import { editarMeuRegistro } from "./actions";
import { ItemRegistro } from "@/components/registros/ItemRegistro";
import { FormRegistro } from "@/components/registros/FormRegistro";
import { Modal } from "@/components/ui/Modal";
import { Botao } from "@/components/ui/Botao";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { EstadoVazio } from "@/components/ui/Estados";
import type { Registro, VeiculoOpcao } from "@/lib/tipos";

export function MeusRegistros({ registros, hoje, temMais, proximoLimite, veiculos }: { registros: Registro[]; hoje: string; temMais: boolean; proximoLimite: number; veiculos: VeiculoOpcao[] }) {
  const [editando, setEditando] = useState<Registro | null>(null);

  if (registros.length === 0) {
    return <EstadoVazio titulo="Nenhum registro ainda" texto="Quando você registrar sua primeira chegada, ela aparece aqui." />;
  }

  return (
    <>
      <ul className="space-y-3">
        {registros.map((r) => (
          <ItemRegistro
            key={r.id}
            registro={r}
            acoes={
              r.data === hoje ? (
                <Botao variante="secundario" onClick={() => setEditando(r)}>
                  <Pencil className="size-4" aria-hidden /> Editar
                </Botao>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Registros de dias anteriores não podem ser alterados">
                  <Lock className="size-3.5" aria-hidden /> Somente leitura
                </span>
              )
            }
          />
        ))}
      </ul>
      {temMais && (
        <div className="mt-4 text-center">
          <Link href={`?limite=${proximoLimite}`} scroll={false} className={classesBotao("secundario", "md")}>
            Ver registros mais antigos <IndicadorLink />
          </Link>
        </div>
      )}
      <Modal aberto={!!editando} aoFechar={() => setEditando(null)} titulo="Editar registro de hoje">
        {editando && <FormRegistro key={editando.id} registro={editando} veiculos={veiculos} acao={editarMeuRegistro} horasTravadas aoConcluir={() => setEditando(null)} />}
      </Modal>
    </>
  );
}
