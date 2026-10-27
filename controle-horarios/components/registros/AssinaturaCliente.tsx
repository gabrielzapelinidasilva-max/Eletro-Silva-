"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Loader2 } from "lucide-react";
import { Campo } from "@/components/ui/Campo";
import { clienteNavegador } from "@/lib/supabase/browser";
import { BUCKET_SERVICOS } from "@/lib/fotos";

/**
 * Assinatura do cliente com o dedo (opcional). Ao terminar de assinar, a imagem é
 * enviada para o Storage e o formulário recebe o caminho (campo oculto).
 */
export function AssinaturaCliente({ usuarioId, registroId, aoMudarEnvio }: { usuarioId: string; registroId: string; aoMudarEnvio: (enviando: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [caminho, setCaminho] = useState("");
  const [estado, setEstado] = useState<"vazio" | "enviando" | "salvo" | "erro">("vazio");

  // Ajusta a resolução do desenho ao tamanho da tela
  useEffect(() => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const ponto = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function inicio(e: React.PointerEvent) {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const { x, y } = ponto(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (timer.current) clearTimeout(timer.current);
  }
  function mover(e: React.PointerEvent) {
    if (!desenhando.current) return;
    const { x, y } = ponto(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
    temTraco.current = true;
  }
  function fim() {
    if (!desenhando.current) return;
    desenhando.current = false;
    if (!temTraco.current) return;
    aoMudarEnvio(true);
    setEstado("enviando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(enviar, 900); // espera terminar de assinar
  }

  async function enviar() {
    const blob = await new Promise<Blob | null>((ok) => canvas.current!.toBlob(ok, "image/png"));
    if (!blob) return;
    const novo = `${usuarioId}/${registroId}/assinatura-${Date.now()}.png`;
    const supabase = clienteNavegador();
    const { error } = await supabase.storage.from(BUCKET_SERVICOS).upload(novo, blob, { contentType: "image/png" });
    if (error) {
      setEstado("erro");
    } else {
      if (caminho) supabase.storage.from(BUCKET_SERVICOS).remove([caminho]).catch(() => {});
      setCaminho(novo);
      setEstado("salvo");
    }
    aoMudarEnvio(false);
  }

  function limpar() {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    temTraco.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (caminho) clienteNavegador().storage.from(BUCKET_SERVICOS).remove([caminho]).catch(() => {});
    setCaminho("");
    setEstado("vazio");
    aoMudarEnvio(false);
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">Assinatura do cliente</p>
          <button type="button" onClick={limpar} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <Eraser className="size-3.5" aria-hidden /> Limpar
          </button>
        </div>
        <canvas
          ref={canvas}
          aria-label="Área para o cliente assinar com o dedo"
          className="h-36 w-full touch-none rounded-xl bg-white ring-1 ring-slate-300"
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fim}
          onPointerLeave={fim}
          onPointerCancel={fim}
        />
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          {estado === "vazio" && "Peça para o cliente assinar com o dedo dentro do quadro."}
          {estado === "enviando" && <><Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando assinatura...</>}
          {estado === "salvo" && <><Check className="size-3.5 text-emerald-600" aria-hidden /> Assinatura salva.</>}
          {estado === "erro" && <span className="font-medium text-red-600">Não foi possível salvar a assinatura. Confira a internet e assine de novo.</span>}
        </p>
        <input type="hidden" name="assinatura" value={caminho} />
      </div>
      <Campo rotulo="Nome de quem assinou (opcional)" name="assinatura_nome" maxLength={120} autoComplete="off" />
    </div>
  );
}
