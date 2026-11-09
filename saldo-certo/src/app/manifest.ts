import type { MetadataRoute } from "next";

/** Manifesto do app: permite instalar o Saldo Certo na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Saldo Certo by Evom",
    short_name: "Saldo Certo by Evom",
    description: "Seu dinheiro no lugar certo. Controle financeiro pessoal. Um produto Evom.",
    lang: "pt-BR",
    start_url: "/ganhos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    theme_color: "#F7931A",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
