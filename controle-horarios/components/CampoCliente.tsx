"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, MapPin, UserRound } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { chaveNome, type Cliente } from "@/lib/clientes";

type Props = {
  clientes: Cliente[];
  valorInicial: string;
  erro?: string;
  rotulo?: string;
  placeholder?: string;
};

/** Coloca o valor num campo do mesmo formulário (endereço, telefone), que não é controlado pelo React. */
function preencher(form: HTMLFormElement | null, nome: string, valor: string | null, soSeVazio: boolean) {
  const campo = form?.elements.namedItem(nome);
  if (!valor || !(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement)) return;
  if (!soSeVazio || !campo.value.trim()) campo.value = valor;
}

/**
 * Campo "Cliente" com sugestões do cadastro de clientes. Ao escolher um cliente,
 * o endereço e o telefone do formulário são preenchidos sozinhos.
 * Se o nome não estiver cadastrado, oferece cadastrar junto (campo "salvar_cliente").
 */
export function CampoCliente({ clientes, valorInicial, erro, rotulo = "Cliente", placeholder = "Digite o nome do cliente" }: Props) {
  const [valor, setValor] = useState(valorInicial);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [salvar, setSalvar] = useState(true);
  const formulario = useRef<HTMLFormElement | null>(null);
  const listaId = useId();

  const termo = chaveNome(valor);
  const sugestoes = (termo ? clientes.filter((c) => chaveNome(c.nome).includes(termo)) : clientes).slice(0, 8);
  const cadastrado = termo ? clientes.find((c) => chaveNome(c.nome) === termo) : undefined;

  /** Escolheu na lista: preenche endereço e telefone. Só digitou o nome: preenche só o que estiver vazio. */
  function escolher(c: Cliente, soSeVazio = false) {
    setValor(c.nome);
    setAberto(false);
    preencher(formulario.current, "endereco", c.endereco, soSeVazio);
    preencher(formulario.current, "telefone", c.telefone, soSeVazio);
  }

  return (
    <div className="relative">
      <Campo
        rotulo={rotulo}
        name="cliente"
        value={valor}
        erro={erro}
        obrigatorio
        maxLength={200}
        autoComplete="off"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={aberto && sugestoes.length > 0}
        aria-controls={listaId}
        aria-autocomplete="list"
        onChange={(e) => { setValor(e.target.value); setAberto(true); setAtivo(0); }}
        onFocus={(e) => { formulario.current = e.currentTarget.form; setAberto(true); }}
        onBlur={() => {
          setAberto(false);
          // Digitou o nome completo de um cliente cadastrado sem escolher na lista.
          if (cadastrado) escolher(cadastrado, true);
        }}
        onKeyDown={(e) => {
          if (!aberto || sugestoes.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => (i + 1) % sugestoes.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => (i - 1 + sugestoes.length) % sugestoes.length); }
          else if (e.key === "Enter") { e.preventDefault(); escolher(sugestoes[ativo]); }
          else if (e.key === "Escape") setAberto(false);
        }}
      />
      {aberto && sugestoes.length > 0 && (
        <ul id={listaId} role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {sugestoes.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === ativo}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(c)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left ${i === ativo ? "bg-marca-50" : "hover:bg-slate-50"}`}>
                <UserRound className="mt-0.5 size-4 shrink-0 text-marca-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{c.nome}</span>
                  {c.endereco && <span className="block truncate text-xs text-slate-500">{c.endereco}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {cadastrado ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5" aria-hidden /> Cliente cadastrado{cadastrado.endereco ? " · endereço preenchido" : ""}
        </p>
      ) : valor.trim() ? (
        <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="salvar_cliente" value="1" checked={salvar} onChange={(e) => setSalvar(e.target.checked)} className="size-4 accent-marca-600" />
          <MapPin className="size-3.5 text-slate-400" aria-hidden /> Cliente novo: cadastrar com o endereço e o telefone
        </label>
      ) : null}
    </div>
  );
}
