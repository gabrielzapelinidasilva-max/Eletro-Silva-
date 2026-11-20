export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** "2026-11-20" -> "20/11/2026" (sem problema de fuso) */
export function formatarData(d: string | null | undefined) {
  if (!d) return "";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

export function formatarDataHora(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function hojeISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Prazo vencido (antes de hoje) */
export function vencido(prazo: string | null, concluido = false) {
  return !!prazo && !concluido && prazo < hojeISO();
}

export function porcentagem(feitos: number, total: number) {
  return total === 0 ? 0 : Math.round((feitos / total) * 100);
}

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

/** Traduz mensagens de erro comuns do Supabase */
export function mensagemErro(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e ?? "");
  const mapa: [RegExp, string][] = [
    [/invalid login credentials/i, "E-mail ou senha incorretos."],
    [/email not confirmed/i, "E-mail ainda não confirmado. Use o link do convite."],
    [/user is banned/i, "Seu acesso está desativado. Fale com um administrador."],
    [/password should be at least/i, "A senha precisa ter pelo menos 6 caracteres."],
    [/new password should be different/i, "A nova senha precisa ser diferente da anterior."],
    [/rate limit|too many requests|security purposes/i, "Muitas tentativas. Aguarde um pouco e tente de novo."],
    [/row-level security|permission denied|42501/i, "Você não tem permissão para fazer isso."],
    [/failed to fetch|network/i, "Sem conexão. Verifique sua internet."],
  ];
  for (const [re, txt] of mapa) if (re.test(msg)) return txt;
  return msg || "Algo deu errado. Tente novamente.";
}
