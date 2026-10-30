"use client";

import { useActionState, useState } from "react";
import { DownloadCloud, MapPin, Pencil, Phone, Plus, Save, Search, Trash2, UserRound } from "lucide-react";
import { excluirCliente, importarClientes, salvarCliente } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { AreaTexto, Campo } from "@/components/ui/Campo";
import { EstadoVazio } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { linkMapa, linkTelefone } from "@/lib/agenda";
import { chaveNome, type Cliente } from "@/lib/clientes";
import { RESULTADO_INICIAL } from "@/lib/tipos";

type Janela = { tipo: "novo" } | { tipo: "editar" | "excluir"; cliente: Cliente } | null;

export function ListaClientes({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [estadoImportar, importar] = useActionState(importarClientes, RESULTADO_INICIAL);
  useToastDoResultado(estadoImportar);

  const termo = chaveNome(busca);
  const lista = termo
    ? clientes.filter((c) => chaveNome(`${c.nome} ${c.endereco ?? ""} ${c.telefone ?? ""}`).includes(termo))
    : clientes;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, endereço ou telefone"
            className="h-11 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-marca-500" />
        </label>
        <form action={importar}>
          <BotaoEnviar variante="secundario" textoCarregando="Importando...">
            <DownloadCloud className="size-4" aria-hidden /> Trazer do histórico
          </BotaoEnviar>
        </form>
        <Botao onClick={() => setJanela({ tipo: "novo" })}><Plus className="size-4" aria-hidden /> Novo cliente</Botao>
      </div>

      {clientes.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente cadastrado" texto="Toque em “Novo cliente” ou em “Trazer do histórico” para cadastrar os clientes que já aparecem nos registros e na agenda." />
      ) : lista.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente encontrado" texto="Tente outro nome." />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-500">{lista.length} {lista.length === 1 ? "cliente" : "clientes"}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((c) => (
              <li key={c.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 font-bold text-slate-900"><UserRound className="size-5 shrink-0 text-marca-600" aria-hidden /> {c.nome}</p>
                <div className="mt-2 flex-1 space-y-1 text-sm text-slate-600">
                  {c.endereco ? (
                    <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden /> <a href={linkMapa(c.endereco)} target="_blank" rel="noopener" className="text-marca-600 underline">{c.endereco}</a></p>
                  ) : (
                    <p className="flex items-center gap-2 text-amber-700"><MapPin className="size-4 shrink-0" aria-hidden /> Sem endereço</p>
                  )}
                  {c.telefone && <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-slate-400" aria-hidden /> <a href={linkTelefone(c.telefone)} className="text-marca-600 underline">{c.telefone}</a></p>}
                  {c.observacoes && <p className="line-clamp-2 text-xs text-slate-500">{c.observacoes}</p>}
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Botao variante="secundario" onClick={() => setJanela({ tipo: "editar", cliente: c })}><Pencil className="size-4" aria-hidden /> Editar</Botao>
                  <Botao variante="perigoSuave" onClick={() => setJanela({ tipo: "excluir", cliente: c })} aria-label={`Excluir ${c.nome}`}><Trash2 className="size-4" aria-hidden /></Botao>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal aberto={janela?.tipo === "novo" || janela?.tipo === "editar"} aoFechar={fechar} titulo={janela?.tipo === "editar" ? "Editar cliente" : "Novo cliente"}>
        {janela?.tipo === "novo" && <FormCliente aoConcluir={fechar} />}
        {janela?.tipo === "editar" && <FormCliente key={janela.cliente.id} cliente={janela.cliente} aoConcluir={fechar} />}
      </Modal>
      <ExcluirCliente cliente={janela?.tipo === "excluir" ? janela.cliente : null} aoFechar={fechar} />
    </>
  );
}

function FormCliente({ cliente, aoConcluir }: { cliente?: Cliente; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(salvarCliente, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const v = (c: string, o: string | null | undefined) => estado.valores?.[c] ?? o ?? "";
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Campo rotulo="Nome" name="nome" defaultValue={v("nome", cliente?.nome)} erro={e.nome} obrigatorio maxLength={200} autoComplete="off" placeholder="Ex.: Padaria Central" />
      <Campo rotulo="Endereço" name="endereco" defaultValue={v("endereco", cliente?.endereco)} maxLength={300} placeholder="Rua, número, bairro, cidade" />
      <Campo rotulo="Telefone (opcional)" name="telefone" type="tel" inputMode="tel" defaultValue={v("telefone", cliente?.telefone)} maxLength={30} />
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v("observacoes", cliente?.observacoes)} rows={2} maxLength={2000} />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando..."><Save className="size-5" aria-hidden /> Salvar</BotaoEnviar>
      </div>
    </form>
  );
}

function ExcluirCliente({ cliente, aoFechar }: { cliente: Cliente | null; aoFechar: () => void }) {
  const [estado, excluir] = useActionState(excluirCliente, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoFechar);
  return (
    <Modal aberto={!!cliente} aoFechar={aoFechar} titulo="Excluir cliente?" largura="sm">
      {cliente && (
        <form action={excluir} className="space-y-5">
          <input type="hidden" name="id" value={cliente.id} />
          <p className="text-slate-600"><strong>{cliente.nome}</strong> sai do cadastro. Os serviços e registros dele continuam na agenda e no histórico.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao>
            <BotaoEnviar variante="perigo" textoCarregando="Excluindo..."><Trash2 className="size-5" aria-hidden /> Sim, excluir</BotaoEnviar>
          </div>
        </form>
      )}
    </Modal>
  );
}
