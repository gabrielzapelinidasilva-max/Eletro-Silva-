"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
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
 * Hora atual (do relógio de São Paulo), só para mostrar. O eletricista não altera:
 * o servidor e o banco gravam a hora do momento em que ele toca no botão.
 */
export function HoraAutomatica({ rotulo, horaInicial }: { rotulo: string; horaInicial: string }) {
  const [valor, setValor] = useState(horaInicial);
  useEffect(() => {
    setValor(horaAgoraSP());
    const t = setInterval(() => setValor(horaAgoraSP()), 15_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <p className="mb-1.5 block text-sm font-semibold text-slate-700">{rotulo}</p>
      <p className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 text-2xl font-bold tabular-nums text-slate-900 ring-1 ring-slate-200" aria-live="off">
        <Lock className="size-4 text-slate-400" aria-hidden /> {valor}
      </p>
      <p className="mt-1 text-xs text-slate-500">Hora registrada automaticamente quando você tocar no botão. Não pode ser alterada.</p>
    </div>
  );
}
