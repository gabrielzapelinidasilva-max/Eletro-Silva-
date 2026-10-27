"use client";

import { useActionState, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { adminEditarRegistro, adminExcluirRegistro } from "./actions";
import { FormRegistro } from "@/components/registros/FormRegistro";
import { Anexos } from "@/components/registros/Anexos";
import { ItemRegistro } from "@/components/registros/ItemRegistro";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarData, formatarDataHora, formatarHora } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import { RESULTADO_INICIAL, type RegistroComPerfil, type VeiculoOpcao } from "@/lib/tipos";
import { formatarMoeda, formatarNumero } from "@/lib/gastos";

type Janela = { tipo: "detalhes" | "editar" | "excluir"; registro: RegistroComPerfil } | null;

export function TabelaRegistros({ registros, veiculos }: { registros: RegistroComPerfil[]; veiculos: VeiculoOpcao[] }) {
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [estadoExclusao, excluir] = useActionState(adminExcluirRegistro, RESULTADO_INICIAL);
  useToastDoResultado(estadoExclusao, fechar);

  const botoes = (r: RegistroComPerfil, compacto = false) => (
    <>
      <Botao variante="fantasma" className={compacto ? "px-2.5" : ""} onClick={() => setJanela({ tipo: "detalhes", registro: r })} aria-label="Ver detalhes" title="Ver detalhes">
        <Eye className="size-5" aria-hidden />
      </Botao>
      <Botao variante="fantasma" className={compacto ? "px-2.5" : ""} onClick={() => setJanela({ tipo: "editar", registro: r })} aria-label="Editar" title="Editar">
        <Pencil className="size-5" aria-hidden />
      </Botao>
      <Botao variante="perigoSuave" className={compacto ? "px-2.5" : ""} onClick={() => setJanela({ tipo: "excluir", registro: r })} aria-label="Excluir" title="Excluir">
        <Trash2 className="size-5" aria-hidden />
      </Botao>
    </>
  );

  return (
    <>
      {registros.length === 0 && <EstadoVazio titulo="Nenhum registro encontrado" texto="Tente mudar o período ou limpar os filtros." />}

      {/* Celular: cartões */}
      <ul className="space-y-3 md:hidden">
        {registros.map((r) => (
          <ItemRegistro key={r.id} registro={r} colaborador={r.profiles?.nome} acoes={botoes(r, true)} />
        ))}
      </ul>

      {/* Telas maiores: tabela */}
      <div className={`hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${registros.length ? "md:block" : ""}`}>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3">Chegada</th>
              <th className="px-4 py-3">Saída</th>
              <th className="px-4 py-3">Horas</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((r) => (
              <tr key={r.id} className="hover:bg-marca-50/40">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatarData(r.data)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{r.profiles?.nome ?? "—"}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatarHora(r.hora_chegada)}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.hora_saida ? formatarHora(r.hora_saida) : <Selo cor="verde">Em andamento</Selo>}</td>
                <td className="px-4 py-2.5 font-semibold tabular-nums">{formatarMinutos(r.minutos_trabalhados)}</td>
                <td className="max-w-48 truncate px-4 py-2.5" title={r.cliente}>{r.cliente}</td>
                <td className="max-w-64 truncate px-4 py-2.5 text-slate-600" title={r.servico ?? ""}>{r.servico ?? "—"}</td>
                <td className="whitespace-nowrap px-2 py-1 text-right">{botoes(r, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={janela?.tipo === "detalhes"} aoFechar={fechar} titulo="Detalhes do registro">
        {janela?.tipo === "detalhes" && <Detalhes veiculos={veiculos} registro={janela.registro} aoEditar={() => setJanela({ tipo: "editar", registro: janela.registro })} />}
      </Modal>

      <Modal aberto={janela?.tipo === "editar"} aoFechar={fechar} titulo={`Editar registro${janela?.registro.profiles?.nome ? ` – ${janela.registro.profiles.nome}` : ""}`}>
        {janela?.tipo === "editar" && <FormRegistro key={janela.registro.id} registro={janela.registro} veiculos={veiculos} acao={adminEditarRegistro} permitirData aoConcluir={fechar} />}
      </Modal>

      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo="Excluir registro?" largura="sm">
        {janela?.tipo === "excluir" && (
          <form action={excluir} className="space-y-5">
            <input type="hidden" name="id" value={janela.registro.id} />
            <p className="text-slate-600">
              O registro de <strong>{janela.registro.profiles?.nome}</strong> em <strong>{formatarData(janela.registro.data)}</strong> (
              {janela.registro.cliente}) vai para a <strong>Lixeira</strong>, junto com os gastos dele. Dá para restaurar por 30 dias.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
              <BotaoEnviar variante="perigo" textoCarregando="Excluindo...">
                <Trash2 className="size-5" aria-hidden /> Sim, mover para a lixeira
              </BotaoEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Detalhes({ registro: r, veiculos, aoEditar }: { registro: RegistroComPerfil; veiculos: VeiculoOpcao[]; aoEditar: () => void }) {
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-sm font-semibold text-slate-500">{rotulo}</dt>
      <dd className="col-span-2 whitespace-pre-wrap break-words text-slate-900">{valor}</dd>
    </div>
  );
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-slate-100">
        {linha("Colaborador", r.profiles?.nome ?? "—")}
        {linha("Data", formatarData(r.data))}
        {linha("Chegada", formatarHora(r.hora_chegada))}
        {linha("Saída", r.hora_saida ? formatarHora(r.hora_saida) : "Em andamento")}
        {linha("Horas", formatarMinutos(r.minutos_trabalhados))}
        {linha("Cliente", r.cliente)}
        {linha("Serviço", r.servico || "—")}
        {linha("Observações", r.observacoes || "—")}
        {linha("Carro", r.veiculo_id ? `${veiculos.find((c) => c.id === r.veiculo_id)?.nome ?? "—"} · ${formatarNumero(Number(r.km_rodados), 1)} km` : "—")}
        {linha("Material", formatarMoeda(Number(r.valor_material)))}
        {linha("Valor cobrado", r.valor_servico == null ? "Não informado" : formatarMoeda(Number(r.valor_servico)))}
        {linha("Criado em", formatarDataHora(r.criado_em))}
        {linha("Atualizado em", formatarDataHora(r.atualizado_em))}
      </dl>
      <Anexos registro={r} />
      <div className="flex justify-end">
        <Botao variante="secundario" onClick={aoEditar}>
          <Pencil className="size-4" aria-hidden /> Editar
        </Botao>
      </div>
    </div>
  );
}
