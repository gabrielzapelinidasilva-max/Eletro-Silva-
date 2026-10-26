import Link from "next/link";
import { Trash2 } from "lucide-react";
import { classesBotao } from "@/components/ui/estilos";
import { IndicadorLink } from "@/components/ui/IndicadorLink";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Botão "Lixeira (n)" para o topo das abas do administrador. */
export async function LinkLixeira() {
  const supabase = await criarClienteServidor();
  const { count } = await supabase.from("lixeira").select("id", { count: "exact", head: true });
  return (
    <Link href="/admin/lixeira" className={classesBotao("secundario", "md")}>
      <Trash2 className="size-4" aria-hidden /> Lixeira{count ? ` (${count})` : ""} <IndicadorLink />
    </Link>
  );
}
