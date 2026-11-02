import type { Metadata } from "next";
import { SummaryTab } from "./summary-tab";

export const metadata: Metadata = { title: "Resumo do Mês" };

export default function Page() {
  return <SummaryTab />;
}
