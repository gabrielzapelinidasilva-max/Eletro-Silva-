"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Copy, KeyRound, Shield, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Avatar, Aviso, Modal } from "@/components/ui";
import { cx, formatarDataHora } from "@/lib/utils";
import {
  alterarPapel, alterarStatus, convidarPessoa, gerarLinkAcesso, listarUsuarios, removerPessoa, type Usuario,
} from "./actions";

export function TelaUsuarios({ meuId }: { meuId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState("");
  const [convidando, setConvidando] = useState(false);
  const [link, setLink] = useState<{ nome: string; url: string; motivo: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const carregar = useCallback(async () => {
    const r = await listarUsuarios();
    if (r.ok) setUsuarios(r.usuarios);
    else setErro(r.erro);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro("");
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Erro");
      await carregar();
    });
  }

  async function linkAcesso(u: Usuario) {
    setErro("");
    const r = await gerarLinkAcesso(u.id);
    if (r.ok) setLink({ nome: u.nome, url: r.link, motivo: "Envie para a pessoa criar (ou trocar) a senha. O link vale por pouco tempo e só pode ser usado uma vez." });
    else setErro(r.erro);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-black/55">Só quem for convidado consegue entrar.</p>
        </div>
        <button className="btn-primario" onClick={() => setConvidando(true)}>
          <UserPlus className="h-4 w-4" /> Convidar pessoa
        </button>
      </div>
      <Aviso>{erro}</Aviso>

      {usuarios === null ? (
        <div className="cartao h-40 animate-pulse bg-white/60" />
      ) : (
        <ul className={cx("space-y-2", pendente && "opacity-60")}>
          {usuarios.map((u) => {
            const eu = u.id === meuId;
            const protegido = u.is_owner;
            return (
              <li key={u.id} className={cx("cartao p-4", !u.ativo && "bg-white/60")}>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar nome={u.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      <span className="truncate">{u.nome}</span>
                      {eu && <span className="chip bg-bege/60 text-black/70">você</span>}
                      {u.is_owner && <span className="chip bg-primaria-clara text-primaria"><ShieldCheck className="h-3 w-3" /> admin principal</span>}
                      {!u.ativo && <span className="chip bg-red-50 text-red-700">desativado</span>}
                      {u.ativo && u.pendente && <span className="chip bg-amber-50 text-amber-700">convite pendente</span>}
                    </p>
                    <p className="truncate text-sm text-black/55">{u.email}</p>
                    {u.ultimo_acesso && <p className="text-xs text-black/40">Último acesso: {formatarDataHora(u.ultimo_acesso)}</p>}
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <label className="sr-only" htmlFor={`papel-${u.id}`}>Papel de {u.nome}</label>
                    <select
                      id={`papel-${u.id}`}
                      className="campo w-auto min-w-36 py-2 text-sm"
                      value={u.role}
                      disabled={protegido || eu || pendente}
                      title={protegido ? "O admin principal não pode ser rebaixado" : eu ? "Você não pode mudar o próprio papel" : ""}
                      onChange={(e) => {
                        const role = e.target.value as Usuario["role"];
                        if (confirm(`${role === "admin" ? "Promover" : "Rebaixar"} ${u.nome} para ${role}?`)) {
                          executar(() => alterarPapel(u.id, role));
                        }
                      }}
                    >
                      <option value="colaborador">Colaborador</option>
                      <option value="admin">Admin</option>
                    </select>
                    {!protegido && !eu && (
                      <>
                        <button className="btn-secundario min-h-10 px-3 text-sm" disabled={pendente}
                                onClick={() => executar(() => alterarStatus(u.id, !u.ativo))}>
                          {u.ativo ? "Desativar" : "Reativar"}
                        </button>
                        <button className="btn-secundario min-h-10 px-3 text-red-600" disabled={pendente} aria-label={`Remover ${u.nome}`} title="Remover"
                                onClick={() => {
                                  if (confirm(`Remover ${u.nome} de vez? A conta é apagada (o histórico fica sem o nome).`)) executar(() => removerPessoa(u.id));
                                }}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {u.ativo && !eu && (
                      <button className="btn-fantasma min-h-10 px-3 text-sm" onClick={() => linkAcesso(u)} title="Gerar link de acesso">
                        <KeyRound className="h-4 w-4" /> <span className="hidden sm:inline">Link de acesso</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="cartao flex gap-3 p-4 text-sm text-black/60">
        <Shield className="h-5 w-5 shrink-0 text-primaria" />
        <p>
          <strong>Admin</strong> cria e edita checklists, modelos e pessoas, e vê tudo.{" "}
          <strong>Colaborador</strong> vê só o que foi atribuído a ele, marca itens e comenta.
        </p>
      </div>

      <ModalConvite
        aberto={convidando}
        aoFechar={() => setConvidando(false)}
        aoConvidar={(nome, r) => {
          carregar();
          if (!r.emailEnviado && r.link) {
            setLink({ nome, url: r.link, motivo: "O e-mail não pôde ser enviado automaticamente. Mande este link para a pessoa (WhatsApp, por exemplo) para ela criar a senha." });
          }
        }}
      />
      <Modal aberto={!!link} aoFechar={() => setLink(null)} titulo={`Link de acesso — ${link?.nome ?? ""}`}>
        <div className="space-y-4">
          <Aviso tipo="info">{link?.motivo}</Aviso>
          <textarea readOnly className="campo min-h-28 font-mono text-xs" value={link?.url ?? ""} onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap justify-end gap-2">
            <a className="btn-secundario" target="_blank" rel="noreferrer"
               href={`https://wa.me/?text=${encodeURIComponent(`Olá! Seu acesso ao Em Ordem: ${link?.url ?? ""}`)}`}>
              WhatsApp
            </a>
            <button className="btn-primario" onClick={() => navigator.clipboard.writeText(link?.url ?? "")}>
              <Copy className="h-4 w-4" /> Copiar link
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModalConvite({ aberto, aoFechar, aoConvidar }: {
  aberto: boolean; aoFechar: () => void;
  aoConvidar: (nome: string, r: { emailEnviado: boolean; link?: string }) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"colaborador" | "admin">("colaborador");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (aberto) { setErro(""); setOk(""); } }, [aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setOk("");
    setEnviando(true);
    const r = await convidarPessoa(nome, email, role);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    const n = nome;
    setNome(""); setEmail(""); setRole("colaborador");
    if (r.emailEnviado) setOk(`Convite enviado para ${email}. A pessoa recebe um e-mail para criar a senha.`);
    else aoFechar();
    aoConvidar(n, r);
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Convidar pessoa">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="cv-nome">Nome</label>
          <input id="cv-nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="cv-email">E-mail</label>
          <input id="cv-email" type="email" inputMode="email" className="campo" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <fieldset>
          <legend className="rotulo">Entra como</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["colaborador", "admin"] as const).map((r) => (
              <label key={r} className={cx("cartao flex cursor-pointer items-center gap-2 p-3 text-sm", role === r && "border-primaria ring-2 ring-primaria/20")}>
                <input type="radio" name="papel" value={r} checked={role === r} onChange={() => setRole(r)} className="accent-primaria" />
                {r === "admin" ? "Admin" : "Colaborador"}
              </label>
            ))}
          </div>
        </fieldset>
        <Aviso>{erro}</Aviso>
        {ok && <Aviso tipo="ok">{ok}</Aviso>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secundario" onClick={aoFechar}>Fechar</button>
          <button className="btn-primario" disabled={enviando}>{enviando ? "Enviando…" : "Enviar convite"}</button>
        </div>
      </form>
    </Modal>
  );
}
