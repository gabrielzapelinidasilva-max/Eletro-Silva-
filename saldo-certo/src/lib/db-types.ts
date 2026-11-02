import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
export type Income = Tables["incomes"]["Row"];
export type Expense = Tables["expenses"]["Row"];
export type FixedExpense = Tables["fixed_expenses"]["Row"];
export type Investment = Tables["investments"]["Row"];
export type MonthlySummary = Database["public"]["Views"]["monthly_summary"]["Row"];
