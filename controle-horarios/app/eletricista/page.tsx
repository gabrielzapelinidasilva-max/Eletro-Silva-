import type { Metadata } from "next";
import { PainelPonto } from "./PainelPonto";
import { MeusRegistros } from "./MeusRegistros";
import { MinhaAgenda } from "./MinhaAgenda";
import { AgendaAoVivo } from "./AgendaAoVivo";
import type { Agendamento } from "@/lib/agenda";
import { Indicador, TituloSecao } from "@/components/ui/Cartao";
import { exigirEletricista } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dataPorExtenso, hojeSP, horaAgoraSP, inicioMes, inicioSemana } from "@/lib/datas";
import { formatarMinutos, somarMinutos } from "@/lib/horas";
import type { Registro, VeiculoOpcao } from "@/lib/tipos";

export const metadata: Metadata = { title: "Meus horários" };

export default async function PaginaEletricista({ searchParams }: { searchParams: Promise<{ limite?: string; cliente?: string }> }) {
  const perfil = await exigirEletricista();
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();
  const semana = inicioSemana(hoje);
  const mes = inicioMes(hoje);
  const params = await searchParams;
  const limite = Math.min(Math.max(Number(params.limite) || 30, 30), 500);
  const clienteSugerido = String(params.cliente ?? "").slice(0, 200);

  const [{ data: lista }, { data: periodo }, { data: aberto }, { data: carros }, { data: agenda }] = await Promise.all([
    supabase.from("registros").select("*").eq("usuario_id", perfil.id)
      .order("data", { ascending: false }).order("hora_chegada", { ascending: false }).limit(limite + 1),
    supabase.from("registros").select("data, minutos_trabalhados").eq("usuario_id", perfil.id).gte("data", semana < mes ? semana : mes),
    supabase.from("registros").select("*").eq("usuario_id", perfil.id).is("hora_saida", null).maybeSingle(),
    supabase.from("veiculos").select("id, nome, consumo_km_l").eq("ativo", true).order("nome"),
    supabase.from("agendamentos").select("*").eq("colaborador_id", perfil.id).eq("status", "agendado").gte("data", hoje)
      .order("data").order("hora", { nullsFirst: false }).limit(100),
  ]);
  const veiculos: VeiculoOpcao[] = (carros ?? []).map((c) => ({ ...c, consumo_km_l: Number(c.consumo_km_l) }));

  const registros = (lista ?? []) as Registro[];
  const doPeriodo = (periodo ?? []) as Pick<Registro, "data" | "minutos_trabalhados">[];
  const total = (desde: string) => formatarMinutos(somarMinutos(doPeriodo.filter((r) => r.data >= desde)));
  const primeiroNome = perfil.nome.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Olá, {primeiroNome}!</h1>
        <p className="mt-0.5 text-slate-500">{dataPorExtenso(hoje)}</p>
      </div>

      <PainelPonto aberto={(aberto as Registro | null) ?? null} hoje={hoje} horaAgora={horaAgoraSP()} veiculos={veiculos} usuarioId={perfil.id} clienteSugerido={clienteSugerido} />

      <AgendaAoVivo usuarioId={perfil.id} itens={(agenda ?? []) as Agendamento[]} />
      <MinhaAgenda itens={(agenda ?? []) as Agendamento[]} hoje={hoje} podeIniciar={!aberto} />

      <section aria-label="Totais de horas" className="grid grid-cols-3 gap-3">
        <Indicador rotulo="Hoje" valor={total(hoje)} />
        <Indicador rotulo="Semana" valor={total(semana)} />
        <Indicador rotulo="Mês" valor={total(mes)} destaque />
      </section>

      <section>
        <TituloSecao>Meus registros</TituloSecao>
        <MeusRegistros veiculos={veiculos} registros={registros.slice(0, limite)} hoje={hoje} temMais={registros.length > limite} proximoLimite={limite + 30} />
      </section>
    </div>
  );
}
