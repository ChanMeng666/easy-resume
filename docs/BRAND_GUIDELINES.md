# Vitex Brand Guidelines

> Official brand design system for Vitex - Your Career, Perfectly Composed

**Version**: 3.0.0  
**Last Updated**: July 2026  
**Status**: Active  
**Design System**: Phantom

> **Implementation spec**: This document covers brand essence and design intent.
> The authoritative, token-level implementation reference is
> [`docs/DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — it is ground truth for exact
> palette values, Tailwind names, named font sizes, and component recipes. Where
> this document and the design system differ, the design system wins.

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Design System: Phantom](#2-design-system-phantom)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Logo Usage](#5-logo-usage)
6. [UI Components](#6-ui-components)
7. [Elevation & Geometry](#7-elevation--geometry)
8. [Motion & Animation](#8-motion--animation)
9. [Layout Patterns](#9-layout-patterns)
10. [Brand Voice](#10-brand-voice)
11. [Implementation Reference](#11-implementation-reference)

---

## 1. Brand Foundation

### 1.1 Brand Name

**Vitex** `/ˈvaɪteks/`

### 1.2 Brand Story

Vitex combines the Latin word "Vita" (meaning life/CV) with "TeX" (the professional typesetting system), symbolizing the power of professional typography infused into your career journey. Every resume is the starting point of a new opportunity - Vitex ensures that starting point is professionally crafted and perfectly composed.

### 1.3 Brand Mission

To empower everyone to create professional-grade resumes using industry-standard typesetting tools, without the complexity of learning Typst syntax. Career as Code: your career facts are source code, and every resume is a build artifact compiled on demand.

### 1.4 Brand Vision

To become the preferred professional resume tool for global tech talent.

### 1.5 Core Values

| Value | Description |
|-------|-------------|
| **Professional** | Typst-level typographic quality |
| **Simple** | Zero learning curve |
| **Portable** | Zero lock-in — export editable `.typ` source anytime |
| **Open** | Open source and transparent |
| **Composed** | Calm, considered, quietly confident design |

### 1.6 Brand Taglines

- **Primary**: "Your Career, Perfectly Composed"
- **Secondary**: "Career as Code — Professional Typst Resumes, Zero Learning Curve"
- **Technical**: "Typst Quality, Zero Complexity"

---

## 2. Design System: Phantom

### 2.1 What is Phantom?

**Phantom** is a soft, monochromatic aubergine-and-lavender aesthetic: flat
surfaces, pill geometry, whisper-weight typography, and generous whitespace. It
replaces the former Neobrutalism system (thick black borders, hard offset
shadows, `#f0f0f0`, `font-black`, Titan One, Vitex Purple/Cyan) and its
"Typeset Proof" layer (crop marks, mono proof-labels, § section numbers)
entirely. The world is quiet and confident rather than loud and tactile.

### 2.2 Why Phantom for Vitex?

1. **Calm confidence**: A composed, editorial surface that lets the work speak
2. **Distinctiveness**: A single-hue aubergine/lavender palette reads as its own brand, not generic "AI slop"
3. **Legibility first**: Light type on airy layouts, high whitespace, restrained accents
4. **Flat and honest**: No fake depth — separation comes from 1px borders, `bone` panels, and space
5. **Accessibility**: Deliberate contrast rules (muted-text floor, dark-text-on-pastel) baked into the palette

### 2.3 Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Flat surfaces** | No shadows except a single lavender glow on the primary CTA |
| **Pill geometry** | Buttons/nav/tags/badges are `rounded-full`; cards `rounded-3xl`; inputs `rounded-2xl` |
| **Whisper-weight type** | Geist at 300/400/500 only — `font-medium` is the emphasis ceiling |
| **Aubergine spine** | `#3c315b` for headings, nav, and dark sections; lavender/periwinkle accents |
| **Generous whitespace** | When in doubt, add space rather than a border |
| **No Dark Mode** | Single, cohesive light theme only |

### 2.4 Design Don'ts

- ❌ No black borders, no `border-2`+ for decoration, no hard offset shadows
- ❌ No `shadow-sm/md/lg/xl` or arbitrary `shadow-[…]` — the only shadow is `shadow-glow`
- ❌ No `font-black`/`font-bold` or any weight 600+; no Titan One / `.font-brand`
- ❌ No `neo-*`, `proof-label`, `crop-frame`, `baseline-grid`, `vitex-grid` classes (deleted)
- ❌ No `#6C3CE9` / `#00D4AA` (old brand colors) in UI code — logos are exempt (see §5)
- ❌ No gradients, background patterns, photos, or decorative floating elements
- ❌ No new colors outside the Phantom palette
- ❌ Don't implement dark mode

---

## 3. Color System

Exact hex/Tailwind mappings live in [`docs/DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md#palette)
and are defined in `src/app/globals.css` (`:root` raw palette + shadcn HSL layer)
and `tailwind.config.ts` (literal color names). Summary:

### 3.1 Core Palette

| Name | HEX | Tailwind | Role |
|------|-----|----------|------|
| **Aubergine** | `#3c315b` | `aubergine` / `text-primary` | Brand spine: headings, nav, dark section bg |
| **Ghost Lavender** | `#e2dffe` | `lavender` | Primary CTA fill (with `shadow-glow`) |
| **Periwinkle** | `#ab9ff2` | `periwinkle` / `ring` | Secondary accent, focus rings, icon accents |
| **Cornflower** | `#4a87f2` | `cornflower` | Rare high-energy `pop` button (marketing only) |
| **Buttercream** | `#ffffc4` | `buttercream` | Pastel `cream` button / warning bg |
| **Blush Mist** | `#ffdadc` | `blush` | Soft destructive bg / warm accent |
| **Mint Signal** | `#2ec08b` | `mint` | Success fills/icons |
| **Mint Ink** | `#157f5c` | `mint-ink` | Success TEXT on white (raw mint fails contrast) |
| **Paper White** | `#fdfcfe` | `paper` / `bg-background` | Page canvas |
| **Obsidian** | `#1c1c1c` | `obsidian` / `text-foreground` | Body text |
| **Fog** | `#86848d` | `fog` | Muted text ≥20px only, decorative strokes |
| **Fog Deep** | `#5f5d67` | `fog-deep` / `text-muted-foreground` | Small muted text (AA-safe) |
| **Ash** | `#e9e8ea` | `ash` / `border` | 1px borders, secondary button bg |
| **Bone** | `#f4f2f4` | `bone` / `bg-muted` | Light panels, hover fills, stat tiles |
| **Rosewood** | `#b23a48` | `bg-destructive` | Solid destructive (final confirmations only) |
| **Rose Ink** | `#9f2936` | `rose-ink` | Destructive text on Blush/white |

### 3.2 Semantic Recipes

- **Success**: `bg-mint/15 text-mint-ink`
- **Warning**: `bg-buttercream text-[#6b5d13]`
- **Destructive (soft)**: `bg-blush text-rose-ink`
- **Destructive (solid)**: `bg-destructive text-destructive-foreground` — AlertDialog confirmations only

### 3.3 Color Usage Rules

1. **One primary action per view** uses `<Button>` default (lavender + `shadow-glow`)
2. **Aubergine** is the spine — headings, nav text, dark-section backgrounds
3. **Accents are restrained** — periwinkle for focus/icons; cornflower/cream at most once per marketing page
4. **No text gradients**, no brand-color gradients — flat fills only
5. **Paper canvas** with `bone` panels and `ash` 1px borders for separation
6. **No dark mode** — maintain the single cohesive light theme

---

## 4. Typography

### 4.1 Type System

Phantom uses a **single typeface** with a strict weight ceiling.

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| **Display / Headings** | Geist | 300 | `text-display` (64px), `text-hero` (96px), `h1–h3` |
| **Body** | Geist | 400 | Default; global `-0.025em` tracking |
| **Emphasis** | Geist | 500 (`font-medium`) | The emphasis ceiling — never heavier |
| **Code** | Geist Mono | 400 | `font-mono`, strictly for code snippets |

- **Geist only** (`font-sans`). Titan One is gone; there is no `.font-brand`.
- Weights are **300 / 400 / 500 only**. Never `font-bold`, `font-black`, or 600+.
- **Tracking** is `-0.025em` everywhere (set globally on `body`; add
  `tracking-tight` on manually built headings).
- Display type (≥64px) collapses line-height to 1.0–1.1.

### 4.2 Named Sizes

Defined in `tailwind.config.ts` (`fontSize`):

| Name | Size | Line-height | Usage |
|------|------|-------------|-------|
| `text-caption` | 13px | 1.35 | Eyebrows, captions, metadata |
| `text-body-sm` | 15px | 1.4 | Dense body copy |
| `text-lead` | 20px | 1.35 | Lead paragraphs |
| `text-display` | 64px | 1.1 | Section display headings |
| `text-hero` | 96px | 1.0 | Hero headline |

Standard Tailwind sizes fill the gaps.

### 4.3 Eyebrow / Label Treatment

There is **no** mono-uppercase label device (the old `.proof-label` is deleted).
When an eyebrow is genuinely needed, use it sparingly:

- On dark: `text-caption uppercase tracking-wider text-periwinkle`
- On light: `text-caption uppercase tracking-wider text-fog-deep`

### 4.4 Typography Rules

1. **Headings** are light-weight (300), aubergine, with balanced wrapping (`h1–h3` are pre-styled in `globals.css`)
2. **Body text** is Geist 400; emphasis tops out at `font-medium` (500)
3. **Tight tracking** (`-0.025em`) is global — reinforce with `tracking-tight` on custom headings
4. **Code** uses Geist Mono, reserved for code snippets only
5. Muted text follows the accessibility floor in §3 / §11

---

## 5. Logo Usage

### 5.1 Logo Presentation

The Vitex logo sits on a flat surface — no bordered card, no hard shadow. Present
it directly on `paper` or `bone`, or inside a plain `rounded-2xl` container when a
container is needed:

```html
<img src="/vitex.svg" alt="Vitex" width="28" height="28" />
```

### 5.2 Logo Placement

| Context | Treatment |
|---------|-----------|
| Navbar | Logo mark + wordmark, flat, no container |
| Footer | Logo mark on the dark aubergine section |
| Favicon | Standard mark, no container |

### 5.3 Logo Wordmark

When displayed as text, use the light Phantom weight:

```html
<span class="text-xl font-medium tracking-tight text-aubergine">Vitex</span>
```

### 5.4 Legacy logo colors (known exception)

> **Honest note:** the logo SVG files in `public/logo/` (and `public/vitex.svg`)
> still carry the **legacy Vitex Purple `#6C3CE9`** brand mark. Phantom bans
> `#6C3CE9` / `#00D4AA` in UI code, but the logo assets are **explicitly exempt**
> until they are redrawn to the Phantom palette. Do not "fix" the logo colors in
> passing — that is a separate, deliberate asset task.

---

## 6. UI Components

Component recipes are enumerated in
[`docs/DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md#components-cheat-sheet). All primitives
live in `src/components/ui/` (shadcn/ui, restyled for Phantom).

### 6.1 Buttons (`src/components/ui/button.tsx`)

Pill geometry (`rounded-full`), `font-medium tracking-tight`, **color-only** hover
transitions. The only elevation is `shadow-glow` on the default variant.

| Variant | Fill | Text | Use |
|---------|------|------|-----|
| `default` | `lavender` + `shadow-glow` | aubergine | Primary action (one per view) |
| `secondary` | `ash` | obsidian | Secondary action |
| `outline` | `paper` + `border-ash` | aubergine | Secondary / quiet action |
| `ghost` | transparent (hover `bone`) | aubergine | Inline / quiet action |
| `link` | none | aubergine | Text link |
| `destructive` | `blush` (soft) | `rose-ink` | Delete / remove |
| `accent` | `periwinkle` | aubergine | Marketing accent (max 1/page) |
| `pop` | `cornflower` | white | Rare marketing CTA (`size="lg"` only) |
| `cream` | `buttercream` | obsidian | Rare marketing accent |

Sizes: `sm` (h-9), `default` (h-10), `lg` (h-12), `icon` (h-10 w-10).

### 6.2 Cards

White fill, `border border-ash` (1px), `rounded-3xl` (24px), generous padding
(`p-8` app / `p-12` marketing). **No shadow.** Panels on paper may instead use
`bg-bone` with no border. Separation comes from the border, the bone fill, and
whitespace — never from elevation.

### 6.3 Inputs & Textareas

`rounded-2xl` (16px), `border border-ash`, periwinkle focus ring (`focus-visible:ring-ring`).
No shadow. Menus/popovers also use `rounded-2xl`.

### 6.4 Badges / Chips

Pill (`rounded-full`), 1px border, no shadow. Variants: `success` (`bg-mint/15
text-mint-ink`), `warning` (`bg-buttercream`), `destructive` (`bg-blush
text-rose-ink`), `accent` (periwinkle), `default` (bone).

### 6.5 Tabs

Bone pill track (`rounded-full`), white active pill. No borders/shadows on the
track — the active pill is distinguished by fill only.

### 6.6 Dialogs / Accordions

Dialogs: `rounded-3xl`, `border border-ash`, no offset shadow (a soft scrim
overlay is fine). Accordions: `ash` 1px dividers, no shadow.

---

## 7. Elevation & Geometry

### 7.1 Elevation — FLAT

- The **only** shadow in the system is `shadow-glow` (`0 0 4px #e2dffe`), reserved
  for the primary lavender CTA. Never use `shadow-sm/md/lg/xl` or arbitrary
  `shadow-[…]`.
- Cards separate via `border border-ash` (1px) + generous padding. Panels on
  paper may instead use `bg-bone` with no border.
- No gradients, background patterns, photos, or decorative floating elements.

```css
/* tailwind.config.ts */
boxShadow: {
  glow: '0 0 4px #e2dffe',   /* the ONLY shadow — primary CTA only */
}
```

### 7.2 Geometry / Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Buttons, nav container, tags, badges, chips | pill | `rounded-full` |
| Cards, panels, dialogs | 24px | `rounded-3xl` |
| Inputs, textareas, menus | 16px | `rounded-2xl` |

**Radius floor**: nothing below 16px on small elements, 24px on cards.

### 7.3 Borders

- 1px only, `border-ash` (`#e9e8ea`). No black borders, no `border-2`+ for decoration.
- Dark sections use `border-white/10` for code blocks and dividers.

---

## 8. Motion & Animation

### 8.1 One Motion Pattern: `<FadeIn>`

The single sanctioned motion pattern is `<FadeIn>`
(`src/components/shared/FadeIn.tsx`): a fade + 8px upward rise, 0.4s, played
**once** when the element scrolls into view. Optional `delay` staggers siblings
(≤0.06s steps, max ~4 staggered siblings per section).

```tsx
<FadeIn delay={0.06}>
  {/* content — fades + drifts up once on scroll into view */}
</FadeIn>
```

### 8.2 Motion Don'ts

- ❌ No `whileHover` scale/rotate/boxShadow
- ❌ No springs, no infinite loops, no page transitions
- ❌ No hard-shadow hover animations (the old Neobrutalism translate-and-shadow pattern is gone)
- **Hover feedback is color change only**, built into the components.

### 8.3 Reduced Motion

`prefers-reduced-motion` is respected globally — animation and transition are
reduced to near-zero.

### 8.4 Focus

Keyboard focus shows a **periwinkle ring** (`focus-visible:ring-ring`), applied
globally via `:focus-visible`.

---

## 9. Layout Patterns

Exact spacing values live in
[`docs/DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md#layout--spacing). Summary:

### 9.1 Page Shell

- Page canvas is `paper` (`#fdfcfe`).
- **`.page-shell`** clears the fixed floating nav (plus a deliberate gap). Use it
  on every route instead of bare top padding. Pair with **`.page-pad-b`** for
  bottom spacing.

### 9.2 Container & Rhythm

- Page container: `max-w-content` (1200px / `75rem`) + `px-4 sm:px-6`, centered.
- Section rhythm: **`.section-y`** or `py-16 md:py-24`; ~64px (`space-y-16`)
  between major blocks.
- Card padding: `p-8` on app surfaces, `p-12` on marketing surfaces. Grid gaps
  `gap-6`–`gap-8`.
- Density is comfortable — prefer whitespace over borders.

### 9.3 Dark Sections

**`.section-dark`** (aubergine bg, paper text) is allowed in **exactly two
places**: the homepage CLI/MCP band and the Footer. All tool/app pages stay
light. On dark: links `text-white/70 hover:text-white`, section labels
`text-periwinkle`, code blocks `rounded-3xl border border-white/10 bg-white/5`.

### 9.4 Navbar

A fixed, floating pill-style nav on `paper`; aubergine text; no bottom border
slab and no hard shadow. `.page-shell` reserves the space beneath it.

### 9.5 Footer

The Footer is one of the two sanctioned `.section-dark` surfaces — aubergine
background, paper/`white/70` text, flat.

---

## 10. Brand Voice

### 10.1 Tone Attributes

| Attribute | Description |
|-----------|-------------|
| **Composed** | Calm, considered, quietly confident |
| **Professional** | Expert, reliable, trustworthy |
| **Friendly** | Approachable, supportive, encouraging |
| **Clear** | Direct, concise, jargon-free |

The voice is anchored in **Career as Code**: your career facts are source, each
tailored PDF is a reproducible build artifact, the refine chain is a sequence of
commits, and the exported `.typ` source is zero lock-in.

### 10.2 UI Copy Examples

| Element | Copy |
|---------|------|
| Primary CTA | "Generate My Resume" or "Get Started" |
| Secondary CTA | "See how it works" |
| Export | "Download .typ source" |
| Empty State | "No resumes yet" |
| Success | "Your resume is ready" |
| Error | "Something went wrong. Please try again." |

---

## 11. Implementation Reference

### 11.1 Ground-Truth Files

| File | Purpose |
|------|---------|
| [`docs/DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | **Authoritative** token + component spec |
| `src/app/globals.css` | `:root` raw palette, shadcn HSL layer, `.page-shell` / `.page-pad-b` / `.section-y` / `.section-dark` utilities |
| `tailwind.config.ts` | Literal color names, `shadow-glow`, `max-w-content`, named font sizes |
| `src/components/ui/` | shadcn primitives restyled for Phantom |
| `src/components/shared/FadeIn.tsx` | The one motion pattern |

### 11.2 Phantom Utility Classes

These replace the deleted `.neo-*` utilities:

| Class | Purpose |
|-------|---------|
| `.page-shell` | Clears the fixed floating nav + gap; use on every route |
| `.page-pad-b` | Consistent bottom padding |
| `.section-y` | Uniform inter-section vertical rhythm |
| `.section-dark` | Aubergine dark band (homepage CLI/MCP band + Footer only) |

### 11.3 Component Library

- **Base**: shadcn/ui components (restyled for Phantom)
- **Styling**: Tailwind CSS (light mode only, no dark mode)
- **Icons**: Lucide React
- **Animation**: Framer Motion — `<FadeIn>` entrances only

### 11.4 Accessibility Red Lines

- Small muted text uses `text-muted-foreground` (Fog Deep). Raw `fog` only ≥20px or decorative.
- Cornflower with white text only at `size="lg"`; otherwise dark text.
- Periwinkle surfaces pair with aubergine/obsidian text — never white.
- Keyboard focus: periwinkle ring, global via `:focus-visible` + `focus-visible:ring-ring`.

### 11.5 Out of Scope

`src/templates/**` and `src/styles/{pdf,a4-layout}.css` style the **generated
resume PDFs**, not the app UI. The Phantom system does not apply there — leave
them untouched.

---

## Appendix A: Migration from v2.x (Neobrutalism → Phantom)

### Breaking Changes in v3.0

1. **Palette replaced** — aubergine/lavender/periwinkle in, Vitex Purple/Cyan out
2. **Flat elevation** — hard offset shadows removed; only `shadow-glow` remains
3. **Pill geometry** — `rounded-full` buttons, `rounded-3xl` cards, `rounded-2xl` inputs
4. **Weight ceiling** — `font-medium` (500) max; `font-black`/`font-bold` and Titan One removed
5. **1px ash borders** replace 2px black borders
6. **Motion collapsed** to a single `<FadeIn>` entrance pattern
7. **"Typeset Proof" layer removed** — crop marks, `.proof-label`, baseline grid, § numbering all deleted

### Removed / Deleted

- Neobrutalism: `.neo-*` utilities, hard shadows, 2px black borders, `#f0f0f0` canvas
- Typeset Proof: `<CropFrame>` / `.crop-frame`, `.proof-label`, `.baseline-grid`, `.vitex-grid`
- Titan One / `.font-brand`; brand text gradients (`.text-gradient-vitex`)
- Vitex Purple `#6C3CE9` / Electric Cyan `#00D4AA` from UI code (logos exempt, see §5.4)

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Jul 2026 | **Phantom** redesign: soft aubergine/lavender, flat surfaces, pill geometry, whisper-weight Geist, single `<FadeIn>` motion. Replaces Neobrutalism + Typeset Proof. See `docs/DESIGN-SYSTEM.md`. |
| 2.1.0 | Jun 2026 | "Typeset Proof" evolution (superseded) |
| 2.0.0 | Dec 2024 | Neobrutalism system (superseded) |
| 1.0.0 | Dec 2024 | Initial brand system creation |

---

**Document maintained by**: Vitex Team  
**Questions?** Open an issue on GitHub
