"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setBusy(false);
      return toast.error("Não foi possível sair. Tente novamente.");
    }
    router.replace("/login");
    router.refresh();
  };
  return (
    <Button variant="ghost" size="icon" onClick={logout} disabled={busy} aria-label="Sair" title="Sair">
      {busy ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
    </Button>
  );
}
