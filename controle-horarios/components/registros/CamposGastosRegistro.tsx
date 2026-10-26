"use client";

import { Car } from "lucide-react";
import { Campo, Selecao } from "@/components/ui/Campo";
import { CampoDinheiro } from "@/components/ui/CampoDinheiro";
import { formatarNumero, paraCampo } from "@/lib/gastos";
import type { VeiculoOpcao } from "@/lib/tipos";

type Valores = { veiculo_id?: string | null; km_rodados?: number; valor_material?: number; valor_servico?: number | null };

/**
 * Carro e km do atendimento (e, só para o administrador, material e valor cobrado).
 * Ao salvar, o lançamento da aba Gastos do administrador é criado/atualizado sozinho.
 */
export function CamposGastosRegistro({ veiculos, inicial, digitado, erros, mostrarValores = false }: {
  veiculos: VeiculoOpcao[];
  inicial?: Valores;
  /** O que foi digitado no último envio (para não perder em caso de erro). */
  digitado?: Record<string, string>;
  erros: Record<string, string>;
  /** Material e valor cobrado: só o administrador vê e preenche. */
  mostrarValores?: boolean;
}) {
  const v = (campo: string, original: string) => digitado?.[campo] ?? original;
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="flex items-center gap-1.5 px-1.5 text-sm font-bold text-marca-700">
        <Car className="size-4" aria-hidden /> {mostrarValores ? "Carro, material e valor do serviço" : "Carro usado"}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao rotulo="Carro usado" name="veiculo_id" defaultValue={v("veiculo_id", inicial?.veiculo_id ?? "")} erro={erros.veiculo_id}>
          <option value="">— Nenhum / a pé —</option>
          {veiculos.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} ({formatarNumero(c.consumo_km_l)} km/l)</option>
          ))}
        </Selecao>
        <Campo rotulo="Km rodados (ida e volta)" name="km_rodados" inputMode="decimal" placeholder="0" defaultValue={v("km_rodados", paraCampo(inicial?.km_rodados, 1))} erro={erros.km_rodados} />
        {mostrarValores && (
          <>
            <CampoDinheiro rotulo="Valor do material" name="valor_material" defaultValue={v("valor_material", paraCampo(inicial?.valor_material))} erro={erros.valor_material} />
            <CampoDinheiro rotulo="Valor cobrado do cliente" name="valor_servico" defaultValue={v("valor_servico", paraCampo(inicial?.valor_servico))} erro={erros.valor_servico} />
          </>
        )}
      </div>
    </fieldset>
  );
}
