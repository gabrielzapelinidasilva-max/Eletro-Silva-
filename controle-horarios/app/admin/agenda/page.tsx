import type { Metadata } from "next";
import { CalendarioAgenda } from "./CalendarioAgenda";
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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Agenda</h1>
        <p className="text-slate-500">Agende os serviços do ano. Para trocar de dia, arraste o serviço para outro dia (no computador) ou use “Mover”.</p>
      </div>
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
