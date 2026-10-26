import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ListaLixeira, type ItemLixeira } from "./ListaLixeira";
import { classesBotao } from "@/components/ui/estilos";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lixeira" };

/** Itens ficam na lixeira por este número de dias; depois são apagados de vez. */
const DIAS_NA_LIXEIRA = 30;

export default async function PaginaLixeira() {
  await exigirAdmin();
  const supabase = await criarClienteServidor();

  // Limpa o que passou do prazo.
  const limite = new Date(Date.now() - DIAS_NA_LIXEIRA * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("lixeira").delete().lt("excluido_em", limite);

  const { data } = await supabase
    .from("lixeira")
    .select("id, tipo, registro, lancamento, data, cliente, colaborador, excluido_em, profiles(nome)")
    .order("excluido_em", { ascending: false })
    .limit(500);

  const itens: ItemLixeira[] = (data ?? []).map((i) => ({
    id: i.id,
    tipo: i.tipo,
    data: i.data,
    cliente: i.cliente,
    colaborador: i.colaborador,
    excluido_em: i.excluido_em,
    excluido_por: (i.profiles as unknown as { nome: string } | null)?.nome ?? null,
    registro: i.registro,
    lancamento: i.lancamento,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lixeira</h1>
          <p className="text-slate-500">
            Serviços e lançamentos excluídos ficam aqui por {DIAS_NA_LIXEIRA} dias. Restaure se excluiu sem querer.
          </p>
        </div>
        <Link href="/admin/registros" className={classesBotao("fantasma", "md")}>
          <ArrowLeft className="size-4" aria-hidden /> Voltar para Registros
        </Link>
      </div>
      <ListaLixeira itens={itens} dias={DIAS_NA_LIXEIRA} />
    </div>
  );
}
