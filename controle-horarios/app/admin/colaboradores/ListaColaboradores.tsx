"use client";

import { useActionState, useState } from "react";
import { KeyRound, Mail, Pencil, Phone, UserCheck, UserPlus, UserX, Save } from "lucide-react";
import { alterarStatus, criarColaborador, editarColaborador, redefinirSenha } from "./actions";
import { Modal } from "@/components/ui/Modal";
import { Botao, BotaoEnviar } from "@/components/ui/Botao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { EstadoVazio, Selo } from "@/components/ui/Estados";
import { useToastDoResultado } from "@/components/ui/Toast";
import { RESULTADO_INICIAL, type Perfil, type Resultado } from "@/lib/tipos";

type Janela = { tipo: "novo" } | { tipo: "editar" | "senha" | "status"; perfil: Perfil } | null;

export function ListaColaboradores({ colaboradores, meuId }: { colaboradores: Perfil[]; meuId: string }) {
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = () => setJanela(null);
  const [estadoStatus, enviarStatus] = useActionState(alterarStatus, RESULTADO_INICIAL);
  useToastDoResultado(estadoStatus, fechar);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {colaboradores.filter((c) => c.ativo).length} ativos · {colaboradores.filter((c) => !c.ativo).length} inativos
        </p>
        <Botao tamanho="lg" onClick={() => setJanela({ tipo: "novo" })}>
          <UserPlus className="size-5" aria-hidden /> Adicionar colaborador
        </Botao>
      </div>

      {colaboradores.length === 0 ? (
        <EstadoVazio titulo="Nenhum colaborador cadastrado" texto="Adicione o primeiro eletricista para ele começar a registrar os horários." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {colaboradores.map((c) => (
            <li key={c.id} className={`flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${c.ativo ? "" : "opacity-75"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marca-100 text-base font-bold text-marca-700" aria-hidden>
                    {c.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {c.nome} {c.id === meuId && <span className="text-xs font-medium text-slate-500">(você)</span>}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      <Selo cor={c.funcao === "admin" ? "ambar" : "azul"}>{c.funcao === "admin" ? "Administrador" : "Eletricista"}</Selo>
                      <Selo cor={c.ativo ? "verde" : "cinza"}>{c.ativo ? "Ativo" : "Inativo"}</Selo>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0 text-slate-400" aria-hidden /> {c.email}</p>
                <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-slate-400" aria-hidden /> {c.telefone || "—"}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1 border-t border-slate-100 pt-3">
                <Botao variante="fantasma" className="px-2" onClick={() => setJanela({ tipo: "editar", perfil: c })}>
                  <Pencil className="size-4" aria-hidden /> Editar
                </Botao>
                <Botao variante="fantasma" className="px-2" onClick={() => setJanela({ tipo: "senha", perfil: c })}>
                  <KeyRound className="size-4" aria-hidden /> Senha
                </Botao>
                <Botao
                  variante={c.ativo ? "perigoSuave" : "sucessoSuave"}
                  className="px-2"
                  disabled={c.id === meuId}
                  title={c.id === meuId ? "Você não pode desativar a sua própria conta" : undefined}
                  onClick={() => setJanela({ tipo: "status", perfil: c })}
                >
                  {c.ativo ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />} {c.ativo ? "Desativar" : "Ativar"}
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal aberto={janela?.tipo === "novo"} aoFechar={fechar} titulo="Adicionar colaborador">
        {janela?.tipo === "novo" && <FormColaborador acao={criarColaborador} aoConcluir={fechar} />}
      </Modal>

      <Modal aberto={janela?.tipo === "editar"} aoFechar={fechar} titulo="Editar colaborador">
        {janela?.tipo === "editar" && <FormColaborador key={janela.perfil.id} perfil={janela.perfil} acao={editarColaborador} aoConcluir={fechar} />}
      </Modal>

      <Modal aberto={janela?.tipo === "senha"} aoFechar={fechar} titulo="Redefinir senha" largura="sm">
        {janela?.tipo === "senha" && <FormSenha key={janela.perfil.id} perfil={janela.perfil} aoConcluir={fechar} />}
      </Modal>

      <Modal aberto={janela?.tipo === "status"} aoFechar={fechar} titulo={janela?.tipo === "status" && janela.perfil.ativo ? "Desativar colaborador?" : "Ativar colaborador?"} largura="sm">
        {janela?.tipo === "status" && (
          <form action={enviarStatus} className="space-y-5">
            <input type="hidden" name="id" value={janela.perfil.id} />
            <input type="hidden" name="ativo" value={String(!janela.perfil.ativo)} />
            <p className="text-slate-600">
              {janela.perfil.ativo ? (
                <><strong>{janela.perfil.nome}</strong> não conseguirá mais entrar no sistema. Todo o histórico de registros será mantido.</>
              ) : (
                <><strong>{janela.perfil.nome}</strong> voltará a conseguir entrar com o mesmo e-mail e senha.</>
              )}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
              <BotaoEnviar variante={janela.perfil.ativo ? "perigo" : "sucesso"} textoCarregando="Salvando...">
                {janela.perfil.ativo ? <UserX className="size-5" aria-hidden /> : <UserCheck className="size-5" aria-hidden />} {janela.perfil.ativo ? "Sim, desativar" : "Sim, ativar"}
              </BotaoEnviar>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

type Acao = (anterior: Resultado, form: FormData) => Promise<Resultado>;

function FormColaborador({ perfil, acao, aoConcluir }: { perfil?: Perfil; acao: Acao; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(acao, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const v = (campo: string, original = "") => estado.valores?.[campo] ?? original;

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {perfil && <input type="hidden" name="id" value={perfil.id} />}
      <Campo rotulo="Nome completo" name="nome" defaultValue={v("nome", perfil?.nome)} erro={e.nome} obrigatorio autoComplete="off" maxLength={120} />
      <Campo rotulo="E-mail" name="email" type="email" inputMode="email" defaultValue={v("email", perfil?.email)} erro={e.email} obrigatorio autoComplete="off" ajuda="Usado para entrar no sistema." />
      <Campo rotulo="Telefone" name="telefone" type="tel" inputMode="tel" placeholder="(48) 99999-9999" defaultValue={v("telefone", perfil?.telefone ?? "")} erro={e.telefone} />
      {!perfil && (
        <Campo rotulo="Senha inicial" name="senha" type="text" erro={e.senha} obrigatorio autoComplete="new-password" ajuda="Mínimo de 6 caracteres. Passe essa senha para o colaborador." />
      )}
      <Selecao rotulo="Função" name="funcao" defaultValue={v("funcao", perfil?.funcao ?? "eletricista")} erro={e.funcao} obrigatorio>
        <option value="eletricista">Eletricista</option>
        <option value="admin">Administrador</option>
      </Selecao>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando...">
          {perfil ? <><Save className="size-5" aria-hidden /> Salvar</> : <><UserPlus className="size-5" aria-hidden /> Adicionar</>}
        </BotaoEnviar>
      </div>
    </form>
  );
}

function FormSenha({ perfil, aoConcluir }: { perfil: Perfil; aoConcluir: () => void }) {
  const [estado, enviar] = useActionState(redefinirSenha, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};

  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={perfil.id} />
      <p className="text-sm text-slate-600">Nova senha para <strong>{perfil.nome}</strong>.</p>
      <Campo rotulo="Nova senha" name="senha" type="password" autoComplete="new-password" erro={e.senha} obrigatorio ajuda="Mínimo de 6 caracteres." />
      <Campo rotulo="Confirmar senha" name="confirmar" type="password" autoComplete="new-password" erro={e.confirmar} obrigatorio />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando...">
          <KeyRound className="size-5" aria-hidden /> Redefinir senha
        </BotaoEnviar>
      </div>
    </form>
  );
}
