/**
 * Single source of truth for the app's visual illustrations.
 *
 * Pages import from here only — never hard-code an illustration path. Each entry
 * carries the intrinsic dimensions (so `next/image` can reserve layout space) and
 * descriptive alt text.
 *
 * Assets ship as hand-crafted SVG placeholders in `public/illustrations/`. The
 * optional `scripts/generate-visual-assets.mjs` pipeline can regenerate them as
 * PNGs via GPT-Image-2; on success it rewrites the `.svg` extensions below to
 * `.png` in place (idempotent string replace). `og-cover` lives in layout
 * metadata only and is deliberately NOT part of this map.
 */
export const ILLUSTRATIONS = {
  /** Wide, croppable frieze used as the top band INSIDE the homepage input
      console card (decoration lives in the content layer, never standalone). */
  consoleBand: {
    src: '/illustrations/console-band.png',
    width: 1536,
    height: 512,
    alt: 'A quiet frieze of overlapping resume sheets drifting apart.',
  },
  /** Two linked sheets — heads the /connect page and connection empty states. */
  connections: {
    src: '/illustrations/connections.png',
    width: 640,
    height: 640,
    alt: 'Two resume sheets joined by a single thin line.',
  },
  stepPaste: {
    src: '/illustrations/step-paste.png',
    width: 640,
    height: 640,
    alt: 'A clipboard holding a pasted job description.',
  },
  stepCompose: {
    src: '/illustrations/step-compose.png',
    width: 640,
    height: 640,
    alt: 'Two resume sheets being aligned and composed together.',
  },
  stepDownload: {
    src: '/illustrations/step-download.png',
    width: 640,
    height: 640,
    alt: 'A finished resume sheet with a download button.',
  },
  notFound: {
    src: '/illustrations/not-found.png',
    width: 640,
    height: 640,
    alt: 'A tilted empty sheet marking a page that could not be found.',
  },
} as const;

/** A single illustration descriptor (src + intrinsic size + alt). */
export type Illustration = (typeof ILLUSTRATIONS)[keyof typeof ILLUSTRATIONS];
