# Vitex Design System — "Phantom"

The authoritative reference for all app UI. Soft, monochromatic aubergine + lavender
world: flat surfaces, pill geometry, whisper-weight type, generous whitespace.
Replaces the former Neobrutalism + "Typeset Proof" systems entirely.

Token sources: `src/app/globals.css` (`:root` raw palette + shadcn HSL layer) and
`tailwind.config.ts` (literal color names, `shadow-glow`, `max-w-content`, named
font sizes).

## Palette

| Name | Hex | Tailwind | Role |
|---|---|---|---|
| Aubergine | `#3c315b` | `aubergine` / `text-primary` | Brand spine: headings, nav text, dark section bg |
| Ghost Lavender | `#e2dffe` | `lavender` | Primary CTA fill (with `shadow-glow`) — the light-on-light button |
| Periwinkle | `#ab9ff2` | `periwinkle` / `ring` | Secondary accent, focus rings, icon accents |
| Cornflower | `#4a87f2` | `cornflower` | Rare high-energy `pop` button (marketing only) |
| Buttercream | `#ffffc4` | `buttercream` | Pastel `cream` button / warning bg |
| Blush Mist | `#ffdadc` | `blush` | Soft destructive bg / warm accent |
| Mint Signal | `#2ec08b` | `mint` | Success fills/icons |
| Mint Ink | `#157f5c` | `mint-ink` | Success TEXT on white (raw mint fails contrast) |
| Paper White | `#fdfcfe` | `paper` / `bg-background` | Page canvas |
| Obsidian | `#1c1c1c` | `obsidian` / `text-foreground` | Body text |
| Fog | `#86848d` | `fog` | Muted text ≥20px ONLY, decorative strokes |
| Fog Deep | `#5f5d67` | `fog-deep` / `text-muted-foreground` | Small muted text (AA-safe) |
| Ash | `#e9e8ea` | `ash` / `border` | 1px borders, secondary button bg |
| Bone | `#f4f2f4` | `bone` / `bg-muted` | Light panels, hover fills, stat tiles |
| Rosewood | `#b23a48` | `bg-destructive` | Solid destructive (AlertDialog confirm only) |
| Rose Ink | `#9f2936` | `rose-ink` | Destructive text on Blush/white |

Semantic recipes: success = `bg-mint/15 text-mint-ink` · warning = `bg-buttercream
text-[#6b5d13]` · destructive-soft = `bg-blush text-rose-ink` · destructive-solid =
`bg-destructive text-destructive-foreground` (final confirmations only).

## Typography

- **Geist only** (`font-sans`); Geist Mono strictly for code snippets. Titan One is gone.
- Weights: 300 (display/h1/h2), 400 (default), 500 (`font-medium`, the emphasis
  ceiling). **Never** `font-bold`, `font-black`, or 600+.
- Tracking: `-0.025em` everywhere (body sets it globally; use `tracking-tight` on
  headings you build manually).
- Named sizes: `text-caption` (13px) · `text-body-sm` (15px) · `text-lead` (20px) ·
  `text-display` (64px, lh 1.1) · `text-hero` (96px, lh 1.0). Standard Tailwind
  sizes fill the gaps.
- Display type (≥64px) collapses line-height to 1.0–1.1. `h1–h3` are pre-styled in
  globals.css (light weight, aubergine, balanced wrapping).
- No mono-uppercase label treatment (the old `.proof-label`). Eyebrow text =
  `text-caption uppercase tracking-wider text-periwinkle` on dark, `text-fog-deep`
  on light — use sparingly.

## Geometry

- Buttons, nav container, tags, badges, chips: **pill** (`rounded-full`).
- Cards/panels/dialogs: `rounded-3xl` (24px). Inputs/textareas/menus: `rounded-2xl` (16px).
- **Radius floor**: nothing below 16px on small elements, 24px on cards.

## Elevation — FLAT

- The ONLY shadow in the system is `shadow-glow` (`0 0 4px #e2dffe`), reserved for
  the primary lavender CTA. Never use `shadow-sm/md/lg/xl` or arbitrary `shadow-[…]`.
- Cards separate via `border border-ash` (1px) + generous padding. Panels on Paper
  may instead use `bg-bone` with no border.
- No gradients, background patterns, photos, or decorative floating elements.

## Layout & Spacing

- Page container: `max-w-content` (1200px) + `px-4 sm:px-6`, centered.
- Page shell: `.page-shell` (clears the floating nav) + `.page-pad-b`.
- Section rhythm: `.section-y` or `py-16 md:py-24`; 64px between major blocks
  (`space-y-16`).
- Card padding: `p-8` on app surfaces, `p-12` on marketing surfaces. Grid gaps
  `gap-6`–`gap-8`.
- Density: comfortable. When in doubt, add whitespace rather than borders.

## Dark sections

`.section-dark` (aubergine bg, paper text) is allowed in EXACTLY two places: the
homepage CLI/MCP band and the Footer. All tool/app pages stay light. On dark:
links `text-white/70 hover:text-white`, section labels `text-periwinkle`, code
blocks `rounded-3xl border border-white/10 bg-white/5`.

## Components (cheat sheet)

| Need | Use |
|---|---|
| Primary action (one per view) | `<Button>` default — lavender + glow |
| Secondary action | `variant="secondary"` (ash) or `outline` |
| Quiet/inline action | `variant="ghost"` or `link` |
| Delete/remove | `variant="destructive"` (blush, soft); AlertDialog confirm uses solid rosewood override |
| Marketing accent (max 1/page) | `variant="accent"` (periwinkle), `pop` (cornflower, `size="lg"` only), `cream` |
| Status chip | `<Badge>` `success` / `warning` / `destructive` / `accent` / `default` (bone) |
| Container | `<Card>` (white, ash border, rounded-3xl) or plain `bg-bone rounded-3xl` tile |
| Text entry | `<Input>` / `<Textarea>` (rounded-2xl, periwinkle focus) |
| Switcher | `<Tabs>` (bone pill track, white active pill) |
| Collapsible | `<Accordion>` (ash dividers) |

## Motion

- ONE pattern: `<FadeIn>` (`src/components/shared/FadeIn.tsx`) — fade + 8px rise,
  0.4s, once, on scroll into view. Optional `delay` for stagger (≤0.06s steps, max
  ~4 staggered siblings per section).
- No `whileHover` scale/rotate/boxShadow, no springs, no infinite loops, no page
  transitions. Hover feedback = color change only (built into components).
- Respect `prefers-reduced-motion` (handled globally).

## Accessibility red lines

- Small muted text = `text-muted-foreground` (Fog Deep). Raw `fog` only ≥20px or decorative.
- Cornflower with white text only at `size="lg"`; otherwise dark text.
- Periwinkle surfaces pair with aubergine/obsidian text — never white.
- Keyboard focus: periwinkle ring, already global via `:focus-visible` + `focus-visible:ring-ring`.

## Don'ts

- No black borders, no `border-2`+ for decoration, no hard offset shadows.
- No `font-black`/`font-bold`, no Titan One, no `.font-brand`.
- No `neo-*`, `proof-label`, `crop-frame`, `baseline-grid`, `vitex-grid` classes (deleted).
- No `#6C3CE9`/`#00D4AA` (old brand colors) in UI code — logos in `public/logo/` are exempt.
- No new colors outside this palette; no gradients or patterns.
- `src/templates/**` and `src/styles/{pdf,a4-layout}.css` style the generated
  resume PDFs — this system does NOT apply there. Leave them untouched.
