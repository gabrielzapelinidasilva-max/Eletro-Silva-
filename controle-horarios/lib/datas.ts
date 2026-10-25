// Datas e horas sempre no fuso de São Paulo. Datas trafegam como texto "AAAA-MM-DD".
export const FUSO = "America/Sao_Paulo";

const fmtDataISO = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Hoje em São Paulo, "AAAA-MM-DD". */
export function hojeSP(agora = new Date()): string {
  return fmtDataISO.format(agora);
}

/** Hora atual em São Paulo, "HH:MM". */
export function horaAgoraSP(agora = new Date()): string {
  return fmtHora.format(agora);
}

/** "AAAA-MM-DD" → "dd/mm/aaaa" */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "HH:MM:SS" → "HH:MM" */
export function formatarHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "—";
}

/** Data e hora de um timestamp (ex.: criado_em) → "dd/mm/aaaa HH:MM" */
export function formatarDataHora(ts: string): string {
  return fmtDataHora.format(new Date(ts)).replace(",", "");
}

function paraUTC(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deUTC(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const dt = paraUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + dias);
  return deUTC(dt);
}

/** Segunda-feira da semana da data. */
export function inicioSemana(iso: string): string {
  const diaSemana = paraUTC(iso).getUTCDay(); // 0 = domingo
  return somarDias(iso, diaSemana === 0 ? -6 : 1 - diaSemana);
}

export function inicioMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** "Sábado, 24 de outubro de 2026" */
export function dataPorExtenso(iso: string): string {
  const texto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(paraUTC(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function dataValida(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(paraUTC(iso).getTime()) && deUTC(paraUTC(iso)) === iso;
}

export function horaValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora);
}
