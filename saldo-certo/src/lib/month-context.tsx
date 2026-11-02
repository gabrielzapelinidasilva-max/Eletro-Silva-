"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { currentMonthSP } from "@/lib/format";

type MonthContextValue = { month: string; setMonth: (ym: string) => void };

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonthSP);
  return <MonthContext.Provider value={{ month, setMonth }}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth deve ser usado dentro de <MonthProvider>");
  return ctx;
}
