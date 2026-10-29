import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, HardHat } from "lucide-react";
import { CalendarioAgenda } from "./CalendarioAgenda";
import { PainelObras } from "./PainelObras";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import type { DiaObra, Obra } from "@/lib/obras";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP, inicioSemana, somarDias } from "@/lib/datas";
import { ultimoDiaDoMes } from "@/lib/fixos";
import type { Agendamento } from "@/lib/agenda";

export const metadata: Metadata = { title: "Agenda" };

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdmin();
  const p = await searchParams;
  const hoje = hojeSP();
  const aba = p.aba === "andamento" ? "andamento" : "calendario";
  if (aba === "andamento") return <AbaAndamento hoje={hoje} />;
  const pedido = String(Array.isArray(p.mes) ? p.mes[0] : p.mes ?? "");
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? `${pedido}-01` : `${hoje.slice(0, 7)}-01`;
  const ano = mes.slice(0, 4);

  // A grade vai da segunda-feira antes do dia 1 até o domingo depois do último dia.
  const inicioGrade = inicioSemana(mes);
  const fimGrade = somarDias(inicioSemana(ultimoDiaDoMes(mes)), 6);

  const supabase = await criarClienteServidor();
  const [{ data: itens }, { data: doAno }, { data: pessoas }] = await Promise.all([
    supabase.from("agendamentos").select("*").gte("data", inicioGrade).lte("data", fimGrade).order("data").order("hora", { nullsFirst: false }),
    supabase.from("agendamentos").select("data").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`).neq("status", "cancelado"),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const porMes = Array.from({ length: 12 }, () => 0);
  (doAno ?? []).forEach((a) => (porMes[Number(String(a.data).slice(5, 7)) - 1] += 1));

  return (
    <div className="space-y-5">
      <Titulo texto="Agende os serviços do ano. Para trocar de dia, arraste o serviço para outro dia (no computador) ou use “Mover”." />
      <AbasAgenda aba="calendario" />
      <CalendarioAgenda
        mes={mes}
        hoje={hoje}
        inicioGrade={inicioGrade}
        fimGrade={fimGrade}
        agendamentos={(itens ?? []) as Agendamento[]}
        porMes={porMes}
        colaboradores={(pessoas ?? []) as { id: string; nome: string }[]}
      />
    </div>
  );
}

function Titulo({ texto }: { texto: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Agenda</h1>
      <p className="text-slate-500">{texto}</p>
    </div>
  );
}

function AbasAgenda({ aba }: { aba: "calendario" | "andamento" }) {
  const item = (alvo: typeof aba, href: string, icone: React.ReactNode, rotulo: string) => (
    <Link href={href} aria-current={aba === alvo ? "page" : undefined}
      className={classesBotao(aba === alvo ? "primario" : "secundario", "md", "flex-1 sm:flex-none")}>
      {icone} {rotulo} <IndicadorLink />
    </Link>
  );
  return (
    <nav aria-label="Partes da aba Agenda" className="flex gap-2">
      {item("calendario", "/admin/agenda", <CalendarDays className="size-4" aria-hidden />, "Calendário")}
      {item("andamento", "/admin/agenda?aba=andamento", <HardHat className="size-4" aria-hidden />, "Serviços em andamento")}
    </nav>
  );
}

/** Serviços em andamento: obras de vários dias, com os dias e os eletricistas escolhidos pelo admin. */
async function AbaAndamento({ hoje }: { hoje: string }) {
  const supabase = await criarClienteServidor();
  const [{ data: obras }, { data: dias }, { data: pessoas }] = await Promise.all([
    supabase.from("obras").select("*").order("criado_em", { ascending: false }),
    supabase.from("agendamentos").select("id, obra_id, data, colaborador_id, status").not("obra_id", "is", null).order("data"),
    supabase.from("profiles").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return (
    <div className="space-y-5">
      <Titulo texto="Obras e serviços que duram vários dias. Escolha os dias e os eletricistas: cada dia entra na agenda e aparece na hora para o eletricista." />
      <AbasAgenda aba="andamento" />
      <PainelObras obras={(obras ?? []) as Obra[]} dias={(dias ?? []) as DiaObra[]} colaboradores={(pessoas ?? []) as { id: string; nome: string }[]} hoje={hoje} />
    </div>
  );
}
