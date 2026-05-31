import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Porra Mundial 2026",
    short_name: "PorraMundial",
    description: "Pronostica los partidos del Mundial 2026 y compite con amigos",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#05070b",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/trofeo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/trofeo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
