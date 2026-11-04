import type { MetadataRoute } from "next";

/** Permite "Adicionar à tela de início" (no iPhone é necessário para receber os lembretes). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eletro Silva – Controle de Horários",
    short_name: "Eletro Silva",
    start_url: "/eletricista",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0049AF",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
