import { EvomFooter, Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo showSlogan />
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <EvomFooter className="mt-8" />
    </div>
  );
}
