import type { MetadataRoute } from "next";

/**
 * Web App Manifest served at /manifest.webmanifest (Next.js file convention).
 *
 * Colors follow the Phantom design system: paper canvas (#fdfcfe) background and
 * aubergine spine (#3c315b) theme. Icons reuse the file-convention PNGs rendered
 * from the Vitex logo (src/app/icon.png, src/app/apple-icon.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitex",
    short_name: "Vitex",
    description:
      "Compile a job-ready resume PDF from a job description and your background — from the web, a CLI, or your AI assistant (ChatGPT / Claude via MCP). Pay only when a real PDF is built; refines and edits are free.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfcfe",
    theme_color: "#3c315b",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
