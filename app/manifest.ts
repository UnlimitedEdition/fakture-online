import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FaktureOnline",
    short_name: "Fakture",
    description:
      "Fakture, KPO knjiga, SEF, ponavljajuće i bankovno uparivanje — sve sa telefona.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "sr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Nova faktura",
        short_name: "Nova",
        description: "Kreiraj novu fakturu",
        url: "/fakture/nova",
      },
      {
        name: "Pregled",
        short_name: "Pregled",
        description: "Dashboard sa prihodom",
        url: "/dashboard",
      },
      {
        name: "Banka",
        short_name: "Banka",
        description: "Uvezi izvod i upari uplate",
        url: "/banka",
      },
    ],
  };
}
