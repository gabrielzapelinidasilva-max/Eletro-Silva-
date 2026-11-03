"use client";

import { useState } from "react";

/** Vídeo vertical (formato de celular). Some sozinho se o arquivo não estiver disponível. */
export default function VideoVertical({ src, capa, titulo }: { src: string; capa?: string; titulo: string }) {
  const [erro, setErro] = useState(false);
  if (!src || erro) return null;

  return (
    <div className="video-vertical">
      <video
        src={`${src}#t=0.5`}
        poster={capa}
        controls
        playsInline
        preload="metadata"
        onError={() => setErro(true)}
        aria-label={titulo}
      />
    </div>
  );
}
