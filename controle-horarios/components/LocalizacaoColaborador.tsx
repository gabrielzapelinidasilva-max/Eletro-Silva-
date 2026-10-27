"use client";

import { useState } from "react";
import { ExternalLink, Map, MapPin, MapPinOff } from "lucide-react";

/** Última localização de um colaborador (aba Resumo do admin), com mapa opcional. */
export function LocalizacaoColaborador({ local }: { local: { latitude: number; longitude: number; precisao: number | null; minutos: number } | null }) {
  const [mapa, setMapa] = useState(false);
  if (!local) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <MapPinOff className="size-3.5" aria-hidden /> Sem localização (app fechado ou localização bloqueada no celular)
      </p>
    );
  }
  const { latitude: lat, longitude: lng } = local;
  const d = 0.004;
  const antigo = local.minutos > 15;
  return (
    <div className="mt-1">
      <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${antigo ? "text-amber-700" : "text-slate-600"}`}>
        <MapPin className="size-3.5" aria-hidden />
        {local.minutos < 1 ? "Agora há pouco" : `Há ${local.minutos} min`}
        {local.precisao ? ` · precisão ~${Math.round(local.precisao)} m` : ""}
        {antigo && " · pode estar desatualizada"}
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 font-semibold text-marca-600 underline">
          Abrir no mapa <ExternalLink className="size-3" aria-hidden />
        </a>
        <button type="button" onClick={() => setMapa((m) => !m)} className="inline-flex items-center gap-0.5 font-semibold text-marca-600 underline">
          <Map className="size-3" aria-hidden /> {mapa ? "Esconder" : "Ver aqui"}
        </button>
      </p>
      {mapa && (
        <iframe
          title="Localização do colaborador"
          className="mt-2 h-48 w-full rounded-xl ring-1 ring-slate-200"
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`}
        />
      )}
    </div>
  );
}
