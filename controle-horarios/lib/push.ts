// Lembretes por notificação (Web Push).

/** Chave pública VAPID (pode ficar no código; a privada fica só na Vercel: VAPID_PRIVATE_KEY). */
export const VAPID_PUBLIC_KEY = "BA2j8gpNL5EIgSs5NDJdvKvsgSmAJc2fS9kYgkGIT5wy9X7o5sICArx1yQPSuww4VtEy1jXdpE69LK67s9yLZbo";

export type TipoLembrete = "chegada" | "saida";

export const LEMBRETES: Record<TipoLembrete, { titulo: string; corpo: string }> = {
  chegada: { titulo: "Já registrou a chegada?", corpo: "Se você já chegou no cliente, toque aqui e registre a chegada." },
  saida: { titulo: "Não esqueça de registrar a saída", corpo: "Ao terminar o serviço (ou sair para o almoço), registre a saída ou o intervalo." },
};
