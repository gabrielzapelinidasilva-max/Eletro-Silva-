import "server-only";
import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./push";

export type Inscricao = { endpoint: string; p256dh: string; auth: string };
export type Mensagem = { titulo: string; corpo: string; url?: string; tag?: string };

export function pushConfigurado() {
  return Boolean(process.env.VAPID_PRIVATE_KEY);
}

/**
 * Envia a mesma mensagem para várias inscrições.
 * Devolve quantas foram e quais não existem mais (para desligar no banco).
 */
export async function enviarPush(inscricoes: Inscricao[], msg: Mensagem) {
  webpush.setVapidDetails("https://eletro-silva-horarios.vercel.app", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY!);
  const corpo = JSON.stringify({ url: "/eletricista", ...msg });
  const resultados = await Promise.allSettled(
    inscricoes.map((i) => webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, { TTL: 60 * 60, urgency: "high" })),
  );
  const mortas: string[] = [];
  let enviadas = 0;
  resultados.forEach((r, n) => {
    if (r.status === "fulfilled") enviadas++;
    else if ([404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) mortas.push(inscricoes[n].endpoint);
  });
  return { enviadas, falhas: inscricoes.length - enviadas, mortas };
}
