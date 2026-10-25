"use client";

import { useEffect, useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { horaAgoraSP } from "@/lib/datas";

/** Mantém só números e coloca os dois-pontos: "0830" → "08:30". */
function mascaraHora(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

type PropsHora = Omit<React.ComponentProps<typeof Campo>, "type" | "onChange"> & { onChange?: (valor: string) => void };

/**
 * Campo de hora sempre em 24h (HH:MM), independente do idioma do celular.
 * O <input type="time"> nativo mostra AM/PM em aparelhos configurados em inglês.
 */
export function CampoHora({ onChange, ...props }: PropsHora) {
  return (
    <Campo
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="hh:mm"
      maxLength={5}
      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
      {...props}
      onChange={(e) => {
        e.currentTarget.value = mascaraHora(e.currentTarget.value);
        onChange?.(e.currentTarget.value);
      }}
    />
  );
}

/**
 * Campo de hora que começa com a hora atual e continua acompanhando o relógio
 * até a pessoa mexer nele (para ajustar manualmente).
 */
export function CampoHoraAtual({ nome, rotulo, horaInicial, erro }: { nome: string; rotulo: string; horaInicial: string; erro?: string }) {
  const [valor, setValor] = useState(horaInicial);
  const [ajustado, setAjustado] = useState(false);

  useEffect(() => {
    if (ajustado) return;
    setValor(horaAgoraSP());
    const t = setInterval(() => setValor(horaAgoraSP()), 15_000);
    return () => clearInterval(t);
  }, [ajustado]);

  return (
    <div>
      <CampoHora
        rotulo={rotulo}
        name={nome}
        value={valor}
        onChange={(v) => {
          setValor(v);
          setAjustado(true);
        }}
        erro={erro}
        obrigatorio
        className="text-center text-2xl font-bold tabular-nums"
      />
      <p className="mt-1 text-xs text-slate-500">
        {ajustado ? (
          <button type="button" className="font-semibold text-marca-600 underline" onClick={() => setAjustado(false)}>
            Voltar para a hora atual
          </button>
        ) : (
          "Hora atual preenchida automaticamente. Toque para ajustar (formato 24h)."
        )}
      </p>
    </div>
  );
}
