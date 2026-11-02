import { cn } from "@/lib/utils";

/** Logo do Saldo Certo: "S" estilizado num círculo laranja com uma seta para cima. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <circle cx="32" cy="32" r="30" fill="#F7931A" />
      <path
        d="M41 21.5c-1.9-2.6-5.2-4-9.1-4-5.6 0-9.4 2.9-9.4 7.2 0 9.4 18.9 5.3 18.9 14 0 4.6-4.1 7.8-10 7.8-4.3 0-7.9-1.6-10-4.6"
        fill="none"
        stroke="#111827"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M46 14l5 0 0 5M51 14l-7 7"
        fill="none"
        stroke="#111827"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, showSlogan = false }: { className?: string; showSlogan?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight">Saldo Certo</p>
        {showSlogan && <p className="text-xs text-muted-foreground">Seu dinheiro no lugar certo</p>}
      </div>
    </div>
  );
}
