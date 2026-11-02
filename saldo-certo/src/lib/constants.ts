export const INCOME_CATEGORIES = ["Salário", "Freelance", "Vendas", "Outros"] as const;
export const EXPENSE_CATEGORIES = [
  "Alimentação", "Transporte", "Lazer", "Saúde", "Casa", "Compras", "Outros",
] as const;
export const INVESTMENT_TYPES = ["Renda Fixa", "Ações", "FIIs", "Cripto", "Poupança", "Outros"] as const;
export const INVESTMENT_OPERATIONS = ["aporte", "resgate"] as const;

export const OPERATION_LABEL: Record<(typeof INVESTMENT_OPERATIONS)[number], string> = {
  aporte: "Aporte",
  resgate: "Resgate",
};

/** Paleta para os gráficos de pizza (ordem fixa por categoria). */
export const CHART_COLORS = [
  "#F7931A", "#2563EB", "#16A34A", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#64748B",
];
