import { ArrowDownCircleIcon, ArrowUpCircleIcon, ChartColumnIcon, PiggyBankIcon, RepeatIcon } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/ganhos", label: "Ganhos", short: "Ganhos", icon: ArrowUpCircleIcon, color: "text-income", bar: "bg-income" },
  { href: "/gastos", label: "Gastos", short: "Gastos", icon: ArrowDownCircleIcon, color: "text-expense", bar: "bg-expense" },
  { href: "/gastos-fixos", label: "Gastos Fixos", short: "Fixos", icon: RepeatIcon, color: "text-fixed", bar: "bg-fixed" },
  { href: "/investimentos", label: "Investimentos", short: "Investir", icon: PiggyBankIcon, color: "text-invest", bar: "bg-invest" },
  { href: "/resumo", label: "Resumo do Mês", short: "Resumo", icon: ChartColumnIcon, color: "text-primary-dark dark:text-primary", bar: "bg-primary" },
] as const;
