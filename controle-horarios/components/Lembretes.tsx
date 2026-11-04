"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Share, Smartphone } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { useToast } from "@/components/ui/Toast";
import { clienteNavegador } from "@/lib/supabase/browser";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

type Estado = "carregando" | "sem-suporte" | "iphone" | "negado" | "desligado" | "ligado";

function chaveBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

/**
 * Ativa os lembretes no celular: 07:45 e 13:45 (chegada) e 11:50 e 17:45 (saída).
 * Cada celular ativa uma vez; a escolha fica salva no banco.
 */
export function Lembretes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado(ios && !instalado ? "iphone" : "sem-suporte");
        return;
      }
      if (Notification.permission === "denied") return setEstado("negado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const inscricao = await reg.pushManager.getSubscription();
      setEstado(inscricao && Notification.permission === "granted" ? "ligado" : "desligado");
      // Mantém o banco em dia (ex.: o navegador trocou a inscrição)
      if (inscricao && Notification.permission === "granted") await salvar(inscricao).catch(() => {});
    })().catch(() => setEstado("sem-suporte"));
  }, []);

  async function salvar(inscricao: PushSubscription) {
    const j = inscricao.toJSON();
    const { error } = await clienteNavegador().rpc("salvar_inscricao_push", { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth });
    if (error) throw error;
  }

  async function ativar() {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const inscricao = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(VAPID_PUBLIC_KEY) }));
      await salvar(inscricao);
      setEstado("ligado");
      toast("sucesso", "Lembretes ativados neste celular.");
    } catch {
      toast("erro", "Não foi possível ativar os lembretes. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        await clienteNavegador().rpc("remover_inscricao_push", { p_endpoint: inscricao.endpoint });
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
      toast("sucesso", "Lembretes desligados neste celular.");
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    try {
      const r = await fetch("/api/lembretes/teste", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      toast(r.ok ? "sucesso" : "erro", r.ok ? "Notificação de teste enviada. Ela deve aparecer em alguns segundos." : j.erro ?? "Não foi possível enviar o teste.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando" || estado === "sem-suporte") return null;

  return (
    <section aria-label="Lembretes" className={`rounded-xl p-4 ring-1 ${estado === "ligado" ? "bg-white ring-slate-200" : "bg-marca-50 ring-marca-200"}`}>
      <div className="flex items-start gap-3">
        {estado === "ligado" ? <BellRing className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /> : <Bell className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden />}
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold text-slate-900">{estado === "ligado" ? "Lembretes ativos neste celular" : "Lembretes de chegada e saída"}</p>
          <p className="text-slate-600">Chegada às 07:45 e 13:45 · saída às 11:50 e 17:45.</p>
          {estado === "iphone" && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-slate-700">
              <Smartphone className="size-4" aria-hidden /> No iPhone: toque em <Share className="inline size-4" aria-label="Compartilhar" /> <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>, abra o app por lá e ative aqui.
            </p>
          )}
          {estado === "negado" && <p className="mt-2 text-amber-800">As notificações estão bloqueadas para este site. Libere nas configurações do navegador (cadeado ao lado do endereço → Notificações → Permitir) e recarregue a página.</p>}
        </div>
      </div>
      {(estado === "desligado" || estado === "ligado") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {estado === "desligado" ? (
            <Botao onClick={ativar} disabled={ocupado} className="w-full sm:w-auto"><Bell className="size-4" aria-hidden /> Ativar lembretes</Botao>
          ) : (
            <>
              <Botao variante="secundario" onClick={testar} disabled={ocupado}><BellRing className="size-4" aria-hidden /> Enviar teste</Botao>
              <Botao variante="fantasma" onClick={desligar} disabled={ocupado}><BellOff className="size-4" aria-hidden /> Desligar</Botao>
            </>
          )}
        </div>
      )}
    </section>
  );
}
