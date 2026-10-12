"use client";

import { useActionState } from "react";
import { enviarFornecedor, type EstadoForm } from "./actions";

export default function FormFornecedor() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(enviarFornecedor, null);

  if (estado?.ok) {
    return <div className="card aviso aviso-ok">{estado.mensagem}</div>;
  }

  return (
    <form action={acao} className="card form">
      <label>
        Empresa
        <input name="empresa" required maxLength={200} autoComplete="organization" />
      </label>
      <label>
        Nome do contato
        <input name="contato" required maxLength={200} autoComplete="name" />
      </label>
      <div className="form-linha">
        <label>
          Telefone
          <input name="telefone" type="tel" required maxLength={30} autoComplete="tel" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label>
        Produtos oferecidos
        <textarea name="produtos" required rows={4} maxLength={3000} />
      </label>
      <input name="site" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden />
      {estado && !estado.ok && <p className="aviso aviso-erro">{estado.mensagem}</p>}
      <button className="btn btn-primario" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
