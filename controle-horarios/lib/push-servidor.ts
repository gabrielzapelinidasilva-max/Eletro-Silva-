import "server-only";
import webpush from "web-push";

export type Inscricao = { endpoint: string; p256dh: string; auth: string; nome?: string };
export type Mensagem = { titulo: string; corpo: string; url?: string; tag?: string };
export type ChavesVapid = { publica: string; privada: string };

/**
 * Envia a mesma mensagem para várias inscrições.
 * Devolve quantas foram e quais não existem mais (para desligar no banco).
 */
export async function enviarPush(chaves: ChavesVapid, inscricoes: Inscricao[], msg: Mensagem) {
  webpush.setVapidDetails("https://eletro-silva-horarios.vercel.app", chaves.publica, chaves.privada);
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

/** Gera um par de chaves VAPID (feito uma vez; fica guardado no banco). */
export function gerarChavesVapid(): ChavesVapid {
  const k = webpush.generateVAPIDKeys();
  return { publica: k.publicKey, privada: k.privateKey };
}
