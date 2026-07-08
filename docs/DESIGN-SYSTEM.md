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

**Derived shades** (formalized from previously shipped hexes — NOT new colors):
each pastel surface has a `-deep` hover shade (`lavender-deep #d6d2fd`,
`ash-deep #dedde0`, `blush-deep #ffcecf`, `periwinkle-deep #9d8ff0`,
`cornflower-deep #3f7ae8`, `buttercream-deep #f7f7b0`) used ONLY as its
color-only hover state, and Buttercream has an AA-safe text ink
(`buttercream-ink #6b5d13`). Always use these tokens — never raw hexes.

Semantic recipes: success = `bg-mint/15 text-mint-ink` · warning = `bg-buttercream
text-buttercream-ink` · destructive-soft = `bg-blush text-rose-ink` · destructive-solid =
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

## Page anatomy

Every route is built from the same three layers, in order:

1. **Shell** — `<PageShell>` (`src/components/shared/PageShell.tsx`). It applies
   `.page-shell .page-pad-b` + gutters and centers the content column. Each page
   picks exactly ONE width: `content` (1200px — lists, marketing, editor) or
   `narrow` (672px — dashboard, focused forms). **Narrow content is always
   centered; never left-pin a narrow column inside a wide container**, and never
   use Tailwind's `container` class.
2. **Header** — `<PageHeader>` (`src/components/shared/PageHeader.tsx`): eyebrow →
   `h1` → one-line lede, optional right-aligned action slot. All workspace pages
   use it so heading rhythm is identical everywhere.
3. **Content** — sections separated by the standard rhythm (`space-y-16`, or
   ash dividers inside a single card).

## Icons

Icons are functional, not decorative. An icon may appear ONLY as:

- **(a) a state indicator** — `Loader2` (loading), `AlertCircle` (error),
  `CheckCircle2` (success) — placed where the state occurs; or
- **(b) an icon-only control** with an `aria-label`, where space genuinely
  forbids a text label — e.g. `X` (close), `Menu`, `MoreHorizontal` (overflow),
  `Send` (chat composer), and the PdfViewer zoom toolbar
  (`ZoomIn/ZoomOut/RotateCw/Maximize2/Download`).

**Never** place an icon beside a text label: no icons in nav links, footer
links, buttons with words ("Download PDF" needs no arrow), pricing plans, list
rows, or section headings. The approved set is the ~10 glyphs above; adding a
new one requires updating this list. Brand-mark exceptions: the GitHub glyph may
appear as an icon-only external link.

## Decoration

Illustrations (GPT-Image-2, `src/lib/illustrations.ts`) live INSIDE content
surfaces — a card's top band, a step card's figure, a page header's side
element. **Never give decoration its own standalone section, framed box, or
band.** If an image has no content neighbor, cut it.

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
| Page container | `<PageShell width="content|narrow">` — see Page anatomy |
| Page heading | `<PageHeader eyebrow title lede actions>` |
| List-row actions | `<RowActions>` — ≤2 visible buttons + overflow menu; destructive items last, separated, rose-ink |
| Copyable command/URL | `<CopyBlock code label>` — bone mono panel, text-only Copy/Copied |

## Interaction patterns

- **Touch targets**: every interactive element is ≥44×44 CSS px on coarse
  pointers. Small pills (example chips, version pills, filters) get
  `.pill-interactive`, which keeps the desktop visual and raises the touch hit
  area via `@media (pointer: coarse)`.
- **Mobile action bar**: `.action-bar-mobile` — a fixed bottom bar (bg-paper,
  1px ash top border, safe-area padding, hidden ≥lg). Max ONE per page, ≤2
  actions; pair with `pb-24 lg:pb-0` on the page container. Never shadowed.
- **Cancelable operations**: any operation the user waits on for >5s (generation,
  refine) must show a Cancel affordance that aborts cleanly (AbortController) and
  returns to the previous state without an error card.
- **Capped inputs**: textareas with a hard length cap show a live character
  counter (`text-caption text-muted-foreground`, turning `text-rose-ink` near the
  cap) and inline `text-rose-ink` validation under the field — never a native
  `alert()`.
- **Mobile PDF preview**: the sanctioned in-page preview below `md` is the
  pdfjs-dist canvas renderer (`PdfCanvasPreview`); blob-URL iframes are
  unreliable on iOS Safari.

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
