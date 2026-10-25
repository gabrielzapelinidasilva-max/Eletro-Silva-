/** 450 → "7h30" */
export function formatarMinutos(minutos: number | null | undefined): string {
  if (minutos == null) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** 450 → "7,50" (horas decimais, para planilhas) */
export function minutosEmHorasDecimais(minutos: number | null | undefined): string {
  if (minutos == null) return "";
  return (minutos / 60).toFixed(2).replace(".", ",");
}

/** Minutos entre duas horas "HH:MM" (negativo se a saída for antes da chegada). */
export function minutosEntre(chegada: string, saida: string): number {
  const [hc, mc] = chegada.split(":").map(Number);
  const [hs, ms] = saida.split(":").map(Number);
  return hs * 60 + ms - (hc * 60 + mc);
}

export function somarMinutos(registros: { minutos_trabalhados: number | null }[]): number {
  return registros.reduce((total, r) => total + (r.minutos_trabalhados ?? 0), 0);
}
