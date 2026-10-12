"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MENU } from "@/lib/site";

export default function Header() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" onClick={() => setAberto(false)}>
          <span className="logo-raio" aria-hidden>⚡</span>
          <span>
            <strong>Eletro Silva</strong>
            <small>Materiais Elétricos</small>
          </span>
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={aberto}
          aria-controls="menu-principal"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? "✕" : "☰"}
          <span className="sr-only">Menu</span>
        </button>
        <nav id="menu-principal" className={`nav ${aberto ? "nav-aberto" : ""}`}>
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "ativo" : undefined}
              onClick={() => setAberto(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
