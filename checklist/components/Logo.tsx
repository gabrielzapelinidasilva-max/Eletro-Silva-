export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={claro ? "#ffffff" : "#1e46e6"} />
        <path d="M18 33l9 9 19-20" fill="none" stroke={claro ? "#1e46e6" : "#dbd8af"} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={claro ? "text-white text-lg" : "text-tinta text-lg"}>Em Ordem</span>
    </span>
  );
}
