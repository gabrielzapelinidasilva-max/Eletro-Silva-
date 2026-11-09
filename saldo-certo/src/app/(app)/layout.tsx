import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ByEvom, EvomFooter, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav, TopTabs } from "@/components/app/app-nav";
import { MonthPicker } from "@/components/app/month-picker";
import { LogoutButton } from "@/components/app/user-menu";
import { MonthProvider } from "@/lib/month-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // O mês atual depende da data da visita: renderiza a cada acesso, não no build.
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh">
      <div className="h-[60px] bg-gradient-to-r from-primary to-primary-dark" />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MonthProvider>
      <div className="min-h-dvh pb-24 md:pb-10">
        <header className="sticky top-0 z-30 border-b border-primary-dark/20 bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <Link href="/ganhos" className="flex items-center gap-2">
              <LogoMark className="size-8 [&_circle]:fill-white" />
              <div className="leading-tight">
                <p className="font-extrabold tracking-tight">
                  Saldo Certo <ByEvom className="rounded-md bg-black/10 px-1.5 py-0.5 opacity-100" />
                </p>
                <p className="hidden text-[11px] font-medium opacity-80 sm:block">Seu dinheiro no lugar certo</p>
              </div>
            </Link>
            <div className="ml-auto flex items-center gap-1 [&_button[data-slot=button]]:hover:bg-black/10">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <TopTabs />
            <div className="flex justify-center md:justify-end">
              <MonthPicker />
            </div>
          </div>
          <main>{children}</main>
          <EvomFooter className="mt-10 hidden md:block" />
        </div>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}
