"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/** Abas no desktop. */
export function TopTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções" className="hidden gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon, color, bar }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-surface shadow-sm" : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && color)} />
            {label}
            {active && <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full", bar)} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra de navegação inferior no celular. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, short, icon: Icon, color }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  active ? color : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
