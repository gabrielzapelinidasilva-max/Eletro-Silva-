import type { Metadata } from "next";
import { ExpensesTab } from "./expenses-tab";

export const metadata: Metadata = { title: "Gastos" };

export default function Page() {
  return <ExpensesTab />;
}
