"use client";

import { useState } from "react";

/** Vídeo vertical do sorteio. Some sozinho se o arquivo ainda não estiver disponível. */
export default function VideoSorteio({ src, capa }: { src: string; capa?: string }) {
  const [erro, setErro] = useState(false);
  if (!src || erro) return null;

  return (
    <div className="video-sorteio">
      <video
        src={`${src}#t=0.5`}
        poster={capa}
        controls
        playsInline
        preload="metadata"
        onError={() => setErro(true)}
        aria-label="Vídeo do sorteio Eletro Silva"
      />
    </div>
  );
}
