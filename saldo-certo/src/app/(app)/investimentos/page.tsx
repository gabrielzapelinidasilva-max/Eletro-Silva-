import type { Metadata } from "next";
import { InvestmentsTab } from "./investments-tab";

export const metadata: Metadata = { title: "Investimentos" };

export default function Page() {
  return <InvestmentsTab />;
}
