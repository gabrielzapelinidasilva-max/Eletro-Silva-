import { Logo } from "@/components/Logo";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="cartao w-full max-w-sm p-6">{children}</div>
      <p className="mt-6 text-center text-xs text-black/45">Acesso somente por convite de um administrador.</p>
    </main>
  );
}
