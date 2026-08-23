import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PG Group Tracker",
    short_name: "PG Tracker",
    description: "Sunbeam PGCP student group assignment tracker",
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7e22ce",
    orientation: "any",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
