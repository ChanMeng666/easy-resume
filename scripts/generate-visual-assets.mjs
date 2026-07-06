#!/usr/bin/env node
/**
 * generate-visual-assets.mjs — regenerate the app's illustration layer with
 * GPT-Image-2.
 *
 * The repo ships hand-crafted SVG placeholders in `public/illustrations/`; this
 * script is an OPTIONAL upgrade that overwrites them with GPT-Image-2 PNGs in the
 * exact Phantom art direction. After the five illustrations succeed it rewrites
 * `src/lib/illustrations.ts` so the `.svg` sources become `.png` (idempotent).
 *
 * No new dependencies: global fetch, node:fs, node:path only. Reads
 * OPENAI_IMAGE_API_KEY, then OPENAI_API_KEY, from the environment; if neither is
 * set it manually parses `.env.local` for them.
 *
 * Usage:
 *   node scripts/generate-visual-assets.mjs            # regenerate all 6 assets
 *   node scripts/generate-visual-assets.mjs --only hero
 *   node scripts/generate-visual-assets.mjs --dry-run  # print prompts, no calls
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ILLUSTRATIONS_DIR = join(ROOT, 'public', 'illustrations');
const ILLUSTRATIONS_TS = join(ROOT, 'src', 'lib', 'illustrations.ts');
const OG_COVER = join(ROOT, 'public', 'og-cover.png');

const API_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-2';

// Shared Phantom art direction prepended to every subject prompt. Encodes the
// palette and the "no text, no gradients, no shadows" rules hard — image models
// love to hallucinate garbage lettering, so text is forbidden in every prompt.
const STYLE_PREFIX =
  'Minimal flat vector-style illustration, soft monochromatic violet palette: ' +
  'deep aubergine #3c315b, pale lavender #e2dffe, periwinkle #ab9ff2, on ' +
  'near-white paper #fdfcfe with light bone #f4f2f4 panels and thin ash #e9e8ea ' +
  'outlines. Overlapping rounded-corner paper sheets, thin quiet linework, ' +
  'enormous negative space, calm, precise, editorial. Absolutely NO text, NO ' +
  'letters, NO words, NO numbers anywhere in the image. No gradients, no ' +
  'shadows, no 3D, no photorealism, no busy detail. Subject: ';

/**
 * Asset specs. `size` is the generation size (divisible by 16); spot art is
 * generated at 1024x1024 for quality and rendered down to 640 by the pages. The
 * `og-cover` writes to public/og-cover.png; everything else to
 * public/illustrations/<name>.png.
 */
const ASSETS = [
  {
    name: 'hero',
    outfile: join(ILLUSTRATIONS_DIR, 'hero-composition.png'),
    size: '1536x640',
    quality: 'high',
    prompt:
      'three or four overlapping rounded-corner portrait paper sheets fanned ' +
      'across a wide canvas, one periwinkle accent sheet slightly rotated ' +
      'behind, the front sheet suggesting a typeset resume through a few thin ' +
      'horizontal aubergine and grey bars standing in for lines of text. ' +
      'Centered composition with wide empty margins.',
  },
  {
    name: 'stepPaste',
    outfile: join(ILLUSTRATIONS_DIR, 'step-paste.png'),
    size: '1024x1024',
    quality: 'medium',
    prompt:
      'a single upright document sheet on a light bone background with a small ' +
      'periwinkle clipboard clip at the top, and a few thin horizontal grey ' +
      'bars suggesting pasted lines of a job description. Quiet and centered.',
  },
  {
    name: 'stepCompose',
    outfile: join(ILLUSTRATIONS_DIR, 'step-compose.png'),
    size: '1024x1024',
    quality: 'medium',
    prompt:
      'two rounded paper sheets being aligned and composed over one another on ' +
      'a light bone background, one a pale lavender sheet, with a small ' +
      'periwinkle four-point spark marking the alignment point. Same visual ' +
      'weight and corner style as its sibling tiles.',
  },
  {
    name: 'stepDownload',
    outfile: join(ILLUSTRATIONS_DIR, 'step-download.png'),
    size: '1024x1024',
    quality: 'medium',
    prompt:
      'a single finished paper sheet on a light bone background with a lavender ' +
      'circular chip straddling its lower edge containing a simple downward ' +
      'arrow icon, and a few thin grey bars above suggesting typeset content.',
  },
  {
    name: 'notFound',
    outfile: join(ILLUSTRATIONS_DIR, 'not-found.png'),
    size: '1024x1024',
    quality: 'medium',
    prompt:
      'a single gently tilted empty paper sheet on a near-white paper ' +
      'background, with a soft periwinkle question mark floating on it and a ' +
      'faint dotted outline where a page should be. Gentle and calm, not ' +
      'cartoonish.',
  },
  {
    name: 'ogCover',
    outfile: OG_COVER,
    size: '1200x624',
    quality: 'high',
    prompt:
      'a wide editorial cover composition of overlapping rounded resume sheets ' +
      'in aubergine, lavender and periwinkle on a paper-white field, one ' +
      'periwinkle accent sheet rotated behind, front sheet hinting a typeset ' +
      'resume through thin horizontal bars. Calm, spacious, brand-forward.',
  },
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

/** Manually parse a KEY=VALUE .env file (no dotenv dep). Comments/blank lines skipped. */
function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Resolve the API key: env first, then .env.local. */
function resolveApiKey() {
  const fromEnv = process.env.OPENAI_IMAGE_API_KEY || process.env.OPENAI_API_KEY;
  if (fromEnv) return fromEnv;
  const local = parseEnvFile(join(ROOT, '.env.local'));
  return local.OPENAI_IMAGE_API_KEY || local.OPENAI_API_KEY || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate one asset. POSTs to the images endpoint, decodes the base64 PNG, and
 * writes it to disk. Retries once on 429/5xx after a 20s backoff.
 */
async function generateAsset(asset, apiKey) {
  const prompt = STYLE_PREFIX + asset.prompt;
  const body = JSON.stringify({
    model: MODEL,
    prompt,
    size: asset.size,
    quality: asset.quality,
    output_format: 'png',
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (res.ok) {
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) throw new Error(`no b64_json in response for ${asset.name}`);
      mkdirSync(dirname(asset.outfile), { recursive: true });
      writeFileSync(asset.outfile, Buffer.from(b64, 'base64'));
      return;
    }

    const retriable = res.status === 429 || res.status >= 500;
    const detail = await res.text().catch(() => '');
    if (retriable && attempt === 1) {
      console.log(`  ! ${asset.name}: HTTP ${res.status}, retrying in 20s…`);
      await sleep(20_000);
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${asset.name}: ${detail.slice(0, 300)}`);
  }
}

/**
 * Rewrite src/lib/illustrations.ts so the illustration sources point at the
 * generated PNGs. Idempotent: a simple `.svg` → `.png` replace scoped to the
 * `/illustrations/` paths, so re-running never corrupts the file.
 */
function switchIllustrationsToPng() {
  const src = readFileSync(ILLUSTRATIONS_TS, 'utf8');
  const next = src.replace(
    /(\/illustrations\/[a-z-]+)\.svg/g,
    '$1.png'
  );
  if (next !== src) {
    writeFileSync(ILLUSTRATIONS_TS, next);
    console.log('  ✓ rewrote src/lib/illustrations.ts (.svg → .png)');
  } else {
    console.log('  = src/lib/illustrations.ts already points at .png');
  }
}

async function main() {
  const selected = ONLY ? ASSETS.filter((a) => a.name === ONLY) : ASSETS;
  if (ONLY && selected.length === 0) {
    console.error(
      `Unknown asset "${ONLY}". Valid names: ${ASSETS.map((a) => a.name).join(', ')}`
    );
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would generate ${selected.length} asset(s):\n`);
    for (const a of selected) {
      console.log(`── ${a.name}  (${a.size}, quality=${a.quality})`);
      console.log(`   → ${a.outfile}`);
      console.log(`   prompt: ${STYLE_PREFIX + a.prompt}\n`);
    }
    return;
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error(
      'No API key found. Set OPENAI_IMAGE_API_KEY (or OPENAI_API_KEY) in your ' +
        'environment or .env.local, then re-run.'
    );
    process.exit(1);
  }

  console.log(`Generating ${selected.length} asset(s) with ${MODEL}…\n`);
  let generatedIllustration = false;

  for (let i = 0; i < selected.length; i++) {
    const asset = selected[i];
    console.log(`[${i + 1}/${selected.length}] ${asset.name} (${asset.size})…`);
    try {
      await generateAsset(asset, apiKey);
      console.log(`  ✓ wrote ${asset.outfile}`);
      if (asset.name !== 'ogCover') generatedIllustration = true;
    } catch (err) {
      console.error(`  ✗ ${asset.name} failed: ${err.message}`);
      process.exit(1);
    }
    // Sequential with a small delay to respect the low-tier image rate limit.
    if (i < selected.length - 1) await sleep(3_000);
  }

  // Only flip the source map once real illustration PNGs exist on disk.
  const allIllustrationsPresent = ASSETS.filter((a) => a.name !== 'ogCover').every(
    (a) => existsSync(a.outfile)
  );
  if (generatedIllustration && allIllustrationsPresent) {
    switchIllustrationsToPng();
  } else if (generatedIllustration) {
    console.log(
      '  = kept illustrations.ts on .svg (not all illustration PNGs present yet)'
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
