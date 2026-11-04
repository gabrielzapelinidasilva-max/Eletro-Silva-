// Lembretes por notificação (Web Push).

export type TipoLembrete = "chegada" | "saida" | "teste";

export const LEMBRETES: Record<Exclude<TipoLembrete, "teste">, { titulo: string; corpo: string }> = {
  chegada: { titulo: "Já registrou a chegada?", corpo: "Se você já chegou no cliente, toque aqui e registre a chegada." },
  saida: { titulo: "Não esqueça de registrar a saída", corpo: "Ao terminar o serviço (ou sair para o almoço), registre a saída ou o intervalo." },
};
