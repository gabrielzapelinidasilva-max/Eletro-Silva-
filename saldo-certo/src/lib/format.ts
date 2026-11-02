export const TIME_ZONE = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata como `R$ 1.234,56`. */
export function formatBRL(value: number | null | undefined) {
  // Intl usa espaço não separável; trocamos por espaço normal.
  return brl.format(Number(value ?? 0)).replace(/ /g, " ");
}

/** Converte "1.234,56" (ou "1234.56") em número. */
export function parseBRL(input: string): number {
  const clean = input.replace(/[R$\s]/g, "");
  if (!clean) return NaN;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  return Number(normalized);
}

/** Número → texto editável no formato brasileiro, ex.: 1234.5 → "1.234,50". */
export function toBRLInput(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "2026-11-02" → "02/11/2026" (sem passar por Date para não sofrer com fuso). */
export function formatDate(isoDate: string | null | undefined) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function todaySP() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mês atual (YYYY-MM) no fuso de São Paulo. */
export function currentMonthSP() {
  return todaySP().slice(0, 7);
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function monthName(index: number) {
  return MONTHS[index];
}

/** "2026-11" → "novembro de 2026" */
export function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** "2026-11" → "nov/26" */
export function formatMonthShort(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
}

/** Soma `delta` meses a "YYYY-MM". */
export function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Primeiro e último dia do mês, para filtros `gte`/`lte`. */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, "0")}` };
}

/** Converte erros técnicos em mensagens amigáveis. */
export function friendlyError(error: unknown): string {
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, "E-mail ou senha incorretos."],
    [/email not confirmed/i, "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."],
    [/user already registered/i, "Já existe uma conta com este e-mail."],
    [/password should be at least/i, "A senha deve ter pelo menos 6 caracteres."],
    [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
    [/failed to fetch|network/i, "Sem conexão com o servidor. Verifique sua internet."],
    [/jwt|not authenticated|session/i, "Sua sessão expirou. Entre novamente."],
    [/same_password|should be different/i, "A nova senha deve ser diferente da anterior."],
    [/check constraint|violates/i, "Algum dado está inválido. Confira os campos."],
  ];
  for (const [re, text] of map) if (re.test(msg)) return text;
  return "Algo deu errado. Tente novamente.";
}
