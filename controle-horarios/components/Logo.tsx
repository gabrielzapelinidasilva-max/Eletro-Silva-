/* eslint-disable @next/next/no-img-element */
/** Logo branca da Eletro Silva (para usar sobre o azul da marca). */
export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src="/logo-branco.webp" alt="Eletro Silva Materiais Elétricos" className={className} width={420} height={180} />;
}
