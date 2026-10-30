"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { clienteNavegador } from "@/lib/supabase/browser";
import { formatarData, formatarHora } from "@/lib/datas";
import type { Agendamento } from "@/lib/agenda";

/**
 * Mantém a "Minha agenda" atualizada sem o eletricista recarregar a página:
 * escuta as mudanças do banco (Realtime) e, por garantia, confere a cada minuto
 * e quando o app volta para a tela. Avisa quando chega um serviço novo ou alterado.
 */
export function AgendaAoVivo({ usuarioId, itens }: { usuarioId: string; itens: Agendamento[] }) {
  const router = useRouter();
  const toast = useToast();
  const anteriores = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    const supabase = clienteNavegador();
    const atualizar = () => router.refresh();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let ativo = true;
    // O Realtime precisa do login do eletricista (o RLS decide o que ele recebe).
    supabase.auth.getSession().then(({ data }: { data: { session: { access_token: string } | null } }) => {
      if (!ativo || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);
      canal = supabase
        .channel(`agenda-${usuarioId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos", filter: `colaborador_id=eq.${usuarioId}` }, atualizar)
        .subscribe();
    });
    const aoVoltar = () => { if (document.visibilityState === "visible") atualizar(); };
    const timer = setInterval(() => { if (document.visibilityState === "visible") atualizar(); }, 60_000);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      ativo = false;
      if (canal) supabase.removeChannel(canal);
    };
  }, [router, usuarioId]);

  // Compara com a lista anterior para avisar o que é novo ou mudou.
  useEffect(() => {
    const atual = new Map(itens.map((a) => [a.id, `${a.data}|${a.hora}|${a.cliente}|${a.endereco}|${a.telefone}|${a.servico}|${a.observacoes}`]));
    const antes = anteriores.current;
    anteriores.current = atual;
    if (!antes) return;
    // Um aviso por serviço (os vários dias de uma obra ou repetição viram um aviso só).
    const avisos = new Map<string, { texto: string; dias: number }>();
    for (const a of itens) {
      const novo = !antes.has(a.id);
      if (!novo && antes.get(a.id) === atual.get(a.id)) continue;
      const chave = `${novo}|${a.obra_id ?? a.serie_id ?? a.id}`;
      const quando = `${formatarData(a.data)}${a.hora ? ` às ${formatarHora(a.hora)}` : ""}`;
      const aviso = avisos.get(chave);
      if (aviso) aviso.dias += 1;
      else avisos.set(chave, { texto: `${novo ? "Novo serviço na sua agenda" : "O administrador alterou um serviço"}: ${a.cliente}, ${quando}`, dias: 1 });
    }
    for (const { texto, dias } of avisos.values()) toast("sucesso", dias > 1 ? `${texto} (${dias} dias).` : `${texto}.`);
  }, [itens, toast]);

  return null;
}
