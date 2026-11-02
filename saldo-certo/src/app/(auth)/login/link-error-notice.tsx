"use client";

import { useSearchParams } from "next/navigation";

export function LinkErrorNotice() {
  const params = useSearchParams();
  if (params.get("erro") !== "link") return null;
  return (
    <p role="alert" className="mb-4 rounded-2xl bg-expense/10 px-4 py-3 text-sm text-expense">
      O link expirou ou já foi usado. Entre com sua senha ou peça um novo link.
    </p>
  );
}
