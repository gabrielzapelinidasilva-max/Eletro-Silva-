// Agenda de serviços.

export type StatusAgendamento = "agendado" | "concluido" | "cancelado";

export type Agendamento = {
  id: string;
  data: string;
  hora: string | null;
  cliente: string;
  endereco: string | null;
  telefone: string | null;
  servico: string | null;
  observacoes: string | null;
  colaborador_id: string | null;
  status: StatusAgendamento;
  obra_id?: string | null;
  serie_id?: string | null;
  criado_em?: string;
  atualizado_em?: string;
};

export const STATUS: { valor: StatusAgendamento; rotulo: string }[] = [
  { valor: "agendado", rotulo: "Agendado" },
  { valor: "concluido", rotulo: "Concluído" },
  { valor: "cancelado", rotulo: "Cancelado" },
];

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Link para abrir o endereço no mapa do celular. */
export function linkMapa(endereco: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

/** Link para ligar (só números). */
export function linkTelefone(telefone: string) {
  return `tel:${telefone.replace(/[^\d+]/g, "")}`;
}
