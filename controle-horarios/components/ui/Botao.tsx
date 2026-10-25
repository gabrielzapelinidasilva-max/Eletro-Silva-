"use client";

import { forwardRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { classesBotao, type Tamanho, type Variante } from "./estilos";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
};

export const Botao = forwardRef<HTMLButtonElement, Props>(function Botao(
  { variante = "primario", tamanho = "md", carregando, className = "", children, disabled, type = "button", ...resto },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || carregando} className={classesBotao(variante, tamanho, className)} {...resto}>
      {carregando && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/** Botão de envio que mostra "carregando" enquanto a server action roda. */
export function BotaoEnviar({ textoCarregando, children, ...props }: Props & { textoCarregando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" carregando={pending} {...props}>
      {pending && textoCarregando ? textoCarregando : children}
    </Botao>
  );
}
