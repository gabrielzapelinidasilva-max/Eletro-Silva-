import type { Metadata } from "next";
import { IncomesTab } from "./incomes-tab";

export const metadata: Metadata = { title: "Ganhos" };

export default function Page() {
  return <IncomesTab />;
}
