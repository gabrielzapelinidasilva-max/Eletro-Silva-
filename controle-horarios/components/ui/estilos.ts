// Classes de botão compartilhadas (podem ser usadas em Server Components, ex.: em <Link>).

export type Variante = "primario" | "secundario" | "perigo" | "fantasma" | "sucesso" | "perigoSuave" | "sucessoSuave";
export type Tamanho = "md" | "lg" | "xl";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-marca-600 text-white hover:bg-marca-700 active:bg-marca-800 focus-visible:outline-marca-600 shadow-sm",
  sucesso: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-emerald-600 shadow-sm",
  secundario: "bg-white text-marca-700 ring-1 ring-inset ring-marca-200 hover:bg-marca-50 active:bg-marca-100 focus-visible:outline-marca-600",
  perigo: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:outline-red-600 shadow-sm",
  fantasma: "text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-marca-600",
  perigoSuave: "text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:outline-red-600",
  sucessoSuave: "text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 focus-visible:outline-emerald-600",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  xl: "min-h-16 px-6 text-lg",
};

export function classesBotao(variante: Variante = "primario", tamanho: Tamanho = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${extra}`;
}
