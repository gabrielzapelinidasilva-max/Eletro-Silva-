"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { clienteNavegador } from "@/lib/supabase/browser";

const INTERVALO_MS = 60_000; // envia no máximo 1 vez por minuto
const DISTANCIA_M = 50; // ou antes, se andou mais de 50 m

function distancia(a: GeolocationCoordinates, b: { lat: number; lng: number }) {
  const r = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.latitude) * rad, dLng = (b.lng - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/**
 * Enquanto o eletricista tem um atendimento em andamento e o app está aberto,
 * envia a localização do celular para o administrador ver.
 */
export function CompartilharLocalizacao({ usuarioId, registroId }: { usuarioId: string; registroId: string }) {
  const [estado, setEstado] = useState<"iniciando" | "ativo" | "negado" | "indisponivel">("iniciando");
  const ultimo = useRef<{ em: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setEstado("indisponivel");
      return;
    }
    const supabase = clienteNavegador();
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setEstado("ativo");
        const u = ultimo.current;
        if (u && Date.now() - u.em < INTERVALO_MS && distancia(pos.coords, u) < DISTANCIA_M) return;
        ultimo.current = { em: Date.now(), lat: pos.coords.latitude, lng: pos.coords.longitude };
        await supabase.from("localizacoes").upsert({
          usuario_id: usuarioId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao: pos.coords.accuracy,
          registro_id: registroId,
          atualizado_em: new Date().toISOString(),
        });
      },
      (erro) => setEstado(erro.code === erro.PERMISSION_DENIED ? "negado" : "indisponivel"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [usuarioId, registroId]);

  if (estado === "negado" || estado === "indisponivel") {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
        <MapPinOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        {estado === "negado"
          ? "A localização está bloqueada neste celular. Para o administrador acompanhar o atendimento, permita a localização para este site nas configurações do navegador."
          : "Não foi possível obter a localização deste celular agora."}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl bg-marca-50 px-3 py-2 text-xs text-marca-900 ring-1 ring-marca-100">
      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
      Sua localização é compartilhada com o administrador enquanto este atendimento estiver em andamento e o app estiver aberto.
    </p>
  );
}
