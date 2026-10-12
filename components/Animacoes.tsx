"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ALVOS = ".card, .secao h2, .categoria-chip, .avalie-qr, .avalie-passos li, .mapa, .horarios";

/** Faz os blocos da página surgirem suavemente conforme entram na tela. */
export default function Animacoes() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("anim-pronto");

    const els = Array.from(document.querySelectorAll<HTMLElement>(ALVOS));
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("visivel");
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    els.forEach((el) => {
      // Escalona elementos irmãos para entrarem um após o outro
      const irmaos = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.style.setProperty("--atraso", `${Math.min(irmaos.indexOf(el), 8) * 70}ms`);
      el.classList.add("revelar");
      obs.observe(el);
    });

    return () => obs.disconnect();
  }, [pathname]);

  return null;
}
