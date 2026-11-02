"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("saldo-certo-tema", dark ? "escuro" : "claro");
    } catch {
      // armazenamento indisponível: o tema vale só nesta sessão
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema claro/escuro" title="Alternar tema">
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
