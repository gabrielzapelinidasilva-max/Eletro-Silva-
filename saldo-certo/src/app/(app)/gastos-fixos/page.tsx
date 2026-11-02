import type { Metadata } from "next";
import { FixedExpensesTab } from "./fixed-expenses-tab";

export const metadata: Metadata = { title: "Gastos Fixos" };

export default function Page() {
  return <FixedExpensesTab />;
}
