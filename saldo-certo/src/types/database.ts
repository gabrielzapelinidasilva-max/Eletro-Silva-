export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = T;
export type Database = {
  public: {
    Tables: {
      incomes: {
        Row: Row<{ id: string; user_id: string; description: string; amount: number; date: string; category: string; created_at: string }>;
        Insert: { id?: string; user_id?: string; description: string; amount: number; date: string; category: string; created_at?: string };
        Update: { id?: string; user_id?: string; description?: string; amount?: number; date?: string; category?: string; created_at?: string };
        Relationships: [];
      };
      expenses: {
        Row: { id: string; user_id: string; description: string; amount: number; date: string; category: string; fixed_expense_id: string | null; is_fixed: boolean; created_at: string };
        Insert: { id?: string; user_id?: string; description: string; amount: number; date: string; category: string; fixed_expense_id?: string | null; is_fixed?: boolean; created_at?: string };
        Update: { id?: string; user_id?: string; description?: string; amount?: number; date?: string; category?: string; fixed_expense_id?: string | null; is_fixed?: boolean; created_at?: string };
        Relationships: [];
      };
      fixed_expenses: {
        Row: { id: string; user_id: string; description: string; amount: number; category: string; start_date: string; next_charge_date: string; active: boolean; created_at: string };
        Insert: { id?: string; user_id?: string; description: string; amount: number; category: string; start_date: string; next_charge_date?: string; active?: boolean; created_at?: string };
        Update: { id?: string; user_id?: string; description?: string; amount?: number; category?: string; start_date?: string; next_charge_date?: string; active?: boolean; created_at?: string };
        Relationships: [];
      };
      investments: {
        Row: { id: string; user_id: string; description: string; amount: number; date: string; type: string; operation: string; created_at: string };
        Insert: { id?: string; user_id?: string; description: string; amount: number; date: string; type: string; operation: string; created_at?: string };
        Update: { id?: string; user_id?: string; description?: string; amount?: number; date?: string; type?: string; operation?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: {
      monthly_summary: {
        Row: { user_id: string | null; month: string | null; total_incomes: number | null; total_variable_expenses: number | null; total_fixed_expenses: number | null; total_invested: number | null; balance: number | null };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
