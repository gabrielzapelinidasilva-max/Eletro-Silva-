import type { Metadata } from "next";
import { Suspense } from "react";
import { FormNovo } from "./FormNovo";

export const metadata: Metadata = { title: "Novo checklist" };

export default function NovoChecklist() {
  return (
    <Suspense>
      <FormNovo />
    </Suspense>
  );
}
