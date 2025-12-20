# Vitex Brand Guidelines

> Official brand design system for Vitex - Your Career, Perfectly Composed

**Version**: 2.0.0  
**Last Updated**: December 2024  
**Status**: Active  
**Design System**: Neobrutalism

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Design System: Neobrutalism](#2-design-system-neobrutalism)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Logo Usage](#5-logo-usage)
6. [UI Components](#6-ui-components)
7. [Shadows & Borders](#7-shadows--borders)
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

To empower everyone to create professional-grade resumes using industry-standard typesetting tools, without the complexity of learning LaTeX syntax.

### 1.4 Brand Vision

To become the preferred professional resume tool for global tech talent.

### 1.5 Core Values

| Value | Description |
|-------|-------------|
| **Professional** | LaTeX-level typographic quality |
| **Simple** | Zero learning curve |
| **Private** | All data stored locally |
| **Open** | Open source and transparent |
| **Bold** | Distinctive, memorable design |

### 1.6 Brand Taglines

- **Primary**: "Your Career, Perfectly Composed"
- **Secondary**: "Professional LaTeX Resumes, Zero Learning Curve"
- **Technical**: "LaTeX Quality, Zero Complexity"

---

## 2. Design System: Neobrutalism

### 2.1 What is Neobrutalism?

Neobrutalism (also known as Neo-brutalism) is a modern design aesthetic that combines the raw, honest approach of Brutalist architecture with contemporary digital design elements. It features:

- **Bold, thick borders** (typically black)
- **Hard shadows** (solid color, no blur)
- **High contrast** color combinations
- **Playful yet professional** aesthetic
- **Clear visual hierarchy**

### 2.2 Why Neobrutalism for Vitex?

1. **Distinctiveness**: Stands out from generic "AI-generated" aesthetics
2. **Professionalism with personality**: Bold but not childish
3. **Clear affordances**: Users immediately understand interactive elements
4. **Memorable**: Creates strong brand recognition
5. **Accessibility**: High contrast improves readability

### 2.3 Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Bold Borders** | All interactive elements have 2-3px black borders |
| **Hard Shadows** | Solid shadows offset 4-8px, no blur |
| **Light Background** | Soft gray (#f0f0f0) base with white cards |
| **High Contrast** | Black borders against colorful fills |
| **Playful Motion** | Subtle hover animations that feel tactile |
| **No Dark Mode** | Single, cohesive light theme only |

### 2.4 Design Don'ts

- ❌ Don't use soft shadows or blur
- ❌ Don't use gradients for backgrounds (reserved for brand accents only)
- ❌ Don't use thin borders (minimum 2px)
- ❌ Don't use rounded shadows (shadows are always rectangular)
- ❌ Don't implement dark mode
- ❌ Don't use generic "Inter" or system fonts for emphasis

---

## 3. Color System

### 3.1 Background Colors

| Name | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Neo Gray** | `#f0f0f0` | `--neo-bg` | Page background |
| **White** | `#ffffff` | `--neo-white` | Card backgrounds |
| **Black** | `#000000` | `--neo-black` | Borders, shadows |

### 3.2 Brand Colors

| Name | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Vitex Purple** | `#6C3CE9` | `--vitex-purple` | Primary buttons, CTAs |
| **Vitex Purple Light** | `#8B5CF6` | `--vitex-purple-light` | Hover states |
| **Vitex Purple Dark** | `#5521C9` | `--vitex-purple-dark` | Active states |
| **Electric Cyan** | `#00D4AA` | `--vitex-cyan` | Accent, success states |
| **Electric Cyan Light** | `#34E7C0` | `--vitex-cyan-light` | Accent hover |

### 3.3 Semantic Colors

| Name | HEX | Usage |
|------|-----|-------|
| **Success** | `#22C55E` (green-500) | Success badges, confirmations |
| **Warning** | `#FACC15` (yellow-400) | Warning messages |
| **Error** | `#EF4444` (red-500) | Error states, destructive |
| **Info** | `#3B82F6` (blue-500) | Informational messages |

### 3.4 Text Colors

| Name | HEX | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Primary** | `#1a1a1a` | `--text-primary` | Headlines, body text |
| **Secondary** | `#525252` | `--text-secondary` | Secondary content |
| **Muted** | `#737373` | `--text-muted` | Placeholders, hints |

### 3.5 Text Gradient (Brand Only)

```css
/* Only for headlines and brand emphasis */
.text-gradient-vitex {
  background: linear-gradient(90deg, #6C3CE9 0%, #00D4AA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 3.6 Color Usage Rules

1. **Primary actions** always use Vitex Purple with black border
2. **Accent actions** use Electric Cyan for secondary CTAs
3. **All interactive elements** have black borders
4. **Text gradients** only on hero headlines, never body text
5. **White backgrounds** for cards, gray for page background
6. **No dark mode** - maintain single cohesive theme

---

## 4. Typography

### 4.1 Font Hierarchy

Vitex uses a three-tier font hierarchy:

| Tier | Font | CSS Variable | Tailwind Class | Usage |
|------|------|--------------|----------------|-------|
| **Brand/Display** | Titan One | `--font-titan-one` | `font-brand` | Hero headlines, CTA titles, brand name |
| **Headlines** | System Stack | - | `font-black` | Section titles, card titles |
| **Body** | System Stack | - | `font-medium` | Body text, descriptions |
| **Code** | Geist Mono | `--font-geist-mono` | `font-mono` | Code, technical content |

### 4.2 Brand Font: Titan One

**Titan One** is our brand display font - a bold, playful typeface that perfectly complements the Neobrutalism design system.

```css
/* Loaded via Next.js Google Fonts */
font-family: 'Titan One', sans-serif;
letter-spacing: 0.05em; /* Applied automatically via .font-brand class */
```

**Design Note:** Titan One has chunky letterforms that can appear crowded at default spacing. The `.font-brand` class automatically applies `letter-spacing: 0.05em` (tracking-wider) for optimal readability.

**Usage Guidelines:**
- Use for Hero section main headlines (H1)
- Use for CTA section titles
- Use for brand name displays ("Vitex")
- **Never use for body text** - reserved for high-impact moments only

```tsx
// Brand headline with gradient
<h1 className="font-brand text-5xl">Your Headline Here</h1>

// Brand text with gradient effect
<span className="text-gradient-vitex-brand text-4xl">Vitex</span>
```

### 4.3 System Font Stack

```css
/* System font stack - clean and fast */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

### 4.4 Font Weights in Neobrutalism

| Weight | Name | CSS Class | Usage |
|--------|------|-----------|-------|
| 400 | Regular (Titan One) | `font-brand` | Brand headlines, Hero titles |
| 900 | Black | `font-black` | Section headlines, card titles |
| 700 | Bold | `font-bold` | Buttons, labels, emphasis |
| 500 | Medium | `font-medium` | Body text, descriptions |
| 400 | Regular | `font-normal` | Code, long-form content |

### 4.5 Type Scale

| Element | Size | Font | Tailwind Classes |
|---------|------|------|------------------|
| H1 (Hero) | 48-72px | Titan One | `text-5xl sm:text-6xl lg:text-7xl font-brand` |
| H1 (CTA) | 30-36px | Titan One | `text-3xl md:text-4xl font-brand` |
| H2 (Section) | 30-36px | System Black | `text-3xl md:text-4xl font-black` |
| H3 (Card) | 20-24px | System Black | `text-xl sm:text-2xl font-black` |
| Body | 16px | System Medium | `text-base font-medium` |
| Small | 14px | System Medium | `text-sm font-medium` |
| Caption | 12px | System Bold | `text-xs font-bold uppercase` |

### 4.6 Typography Rules

1. **Hero headlines** use `font-brand` (Titan One)
2. **CTA section titles** use `font-brand` (Titan One)
3. **Section headlines** use `font-black` (weight 900)
4. **Buttons and labels** use `font-bold` (weight 700)
5. **Body text** uses `font-medium` (weight 500)
6. **Tight letter spacing** for headlines (`tracking-tight`)
7. **Uppercase** for tags and small badges

### 4.7 Brand Text Gradient

Combine Titan One with the brand gradient for maximum visual impact:

```css
/* Brand font with gradient effect */
.text-gradient-vitex-brand {
  font-family: var(--font-titan-one), sans-serif;
  background: linear-gradient(90deg, #6C3CE9 0%, #00D4AA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Use this class for:
- Featured hero text with emphasis
- Brand name displays in marketing sections
- Key phrases that need maximum attention

---

## 5. Logo Usage

### 5.1 Logo in Neobrutalism Context

The Vitex logo should be displayed within a card container:

```html
<div class="p-2 bg-white rounded-lg border-2 border-black 
            shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]">
  <img src="/vitex.svg" alt="Vitex" width="28" height="28" />
</div>
```

### 5.2 Logo Placement

| Context | Treatment |
|---------|-----------|
| Navbar | Logo in bordered card container |
| Footer | Logo with larger padding and shadow |
| Favicon | Standard usage without container |

### 5.3 Logo Wordmark

When displayed as text:

```html
<span class="text-xl font-black">Vitex</span>
```

Or with gradient:

```html
<span class="text-3xl font-black text-gradient-vitex">Vitex</span>
```

---

## 6. UI Components

### 6.1 Buttons

#### Primary Button
```css
.btn-primary {
  background-color: #6C3CE9;
  color: white;
  border: 2px solid black;
  border-radius: 0.5rem; /* rounded-lg */
  padding: 0.625rem 1.25rem; /* h-10 px-5 */
  font-weight: 700;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  box-shadow: 6px 6px 0px 0px rgba(0,0,0,0.9);
  transform: translate(-2px, -2px);
}

.btn-primary:active {
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
  transform: translate(2px, 2px);
}
```

#### Outline Button
```css
.btn-outline {
  background-color: white;
  color: #1a1a1a;
  border: 2px solid black;
  border-radius: 0.5rem;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
  /* Same hover/active as primary */
}
```

#### Ghost Button
```css
.btn-ghost {
  background-color: transparent;
  border: 2px solid transparent;
  box-shadow: none;
}

.btn-ghost:hover {
  background-color: #f3f4f6;
  border-color: black;
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
}
```

#### Button Sizes

| Size | Height | Padding | Border Radius |
|------|--------|---------|---------------|
| sm | 32px | 16px horizontal | 6px |
| default | 40px | 20px horizontal | 8px |
| lg | 48px | 32px horizontal | 12px |

### 6.2 Cards

```css
.card {
  background-color: white;
  border: 2px solid black;
  border-radius: 0.75rem; /* rounded-xl */
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 6px 6px 0px 0px rgba(0,0,0,0.9);
  transform: translate(-2px, -2px);
}
```

### 6.3 Inputs

```css
.input {
  background-color: white;
  border: 2px solid black;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
  transform: translate(-2px, -2px);
}
```

### 6.4 Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid black;
  border-radius: 0.5rem;
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
}

/* Variants */
.badge-primary { background-color: #6C3CE9; color: white; }
.badge-accent { background-color: #00D4AA; color: white; }
.badge-warning { background-color: #FACC15; color: black; }
.badge-success { background-color: #22C55E; color: white; }
```

### 6.5 Tabs

```css
.tabs-list {
  background-color: white;
  border: 2px solid black;
  border-radius: 0.75rem;
  padding: 0.375rem;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
}

.tab-trigger {
  padding: 0.5rem 1rem;
  font-weight: 700;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.tab-trigger[data-state="active"] {
  background-color: #6C3CE9;
  color: white;
  border: 2px solid black;
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
}
```

### 6.6 Dialogs

```css
.dialog-overlay {
  background-color: rgba(0, 0, 0, 0.6);
}

.dialog-content {
  background-color: white;
  border: 2px solid black;
  border-radius: 0.75rem;
  box-shadow: 8px 8px 0px 0px rgba(0,0,0,0.9);
  padding: 1.5rem;
}

.dialog-close-button {
  width: 32px;
  height: 32px;
  border: 2px solid black;
  border-radius: 0.5rem;
  background-color: white;
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
}
```

### 6.7 Dropdown Menus

```css
.dropdown-content {
  background-color: white;
  border: 2px solid black;
  border-radius: 0.75rem;
  padding: 0.5rem;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
}

.dropdown-item {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}

.dropdown-separator {
  height: 2px;
  background-color: black;
  margin: 0.25rem 0;
}
```

---

## 7. Shadows & Borders

### 7.1 Shadow Scale

| Name | CSS Value | Tailwind | Usage |
|------|-----------|----------|-------|
| **sm** | `2px 2px 0px 0px rgba(0,0,0,0.9)` | `shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]` | Small elements, badges |
| **default** | `4px 4px 0px 0px rgba(0,0,0,0.9)` | `shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]` | Cards, buttons, inputs |
| **lg** | `6px 6px 0px 0px rgba(0,0,0,0.9)` | `shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]` | Hover states |
| **xl** | `8px 8px 0px 0px rgba(0,0,0,0.9)` | `shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]` | Dialogs, hero elements |

### 7.2 CSS Variables for Shadows

```css
:root {
  --neo-shadow-sm: 2px 2px 0px 0px rgba(0,0,0,0.9);
  --neo-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
  --neo-shadow-lg: 6px 6px 0px 0px rgba(0,0,0,0.9);
  --neo-shadow-xl: 8px 8px 0px 0px rgba(0,0,0,0.9);
}
```

### 7.3 Border Standards

| Element | Border Width | Color |
|---------|--------------|-------|
| Cards | 2px | black |
| Buttons | 2px | black |
| Inputs | 2px | black |
| Dialogs | 2px | black |
| Tags/Badges | 2px | black |
| Dividers | 2px | black |

### 7.4 Border Radius Scale

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| **sm** | 4px | `rounded` | Tags |
| **md** | 6px | `rounded-md` | Small buttons |
| **lg** | 8px | `rounded-lg` | Buttons, inputs |
| **xl** | 12px | `rounded-xl` | Cards, dialogs |
| **2xl** | 16px | `rounded-2xl` | Hero sections |

---

## 8. Motion & Animation

### 8.1 Hover Behavior Pattern

All interactive cards follow this pattern:

```css
.interactive-card {
  transition: all 0.2s ease;
}

.interactive-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px 0px rgba(0,0,0,0.9);
}
```

### 8.2 Button Click Pattern

```css
.button:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.9);
}
```

### 8.3 Framer Motion Usage

Use framer-motion for:
- Page load animations (`initial`, `animate`)
- Scroll-triggered reveals (`whileInView`)
- Staggered list animations

**Do NOT use framer-motion for:**
- Hover shadows (use CSS instead to respect border-radius)
- Random values that cause hydration mismatches

```tsx
// Good: CSS hover + framer-motion for entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] 
             hover:translate-x-[-2px] hover:translate-y-[-2px]
             transition-all duration-200"
>
  {/* content */}
</motion.div>

// Bad: framer-motion whileHover with boxShadow
<motion.div
  whileHover={{ boxShadow: "8px 8px 0px 0px rgba(0,0,0,0.9)" }}
>
  {/* Shadow will be square, not rounded! */}
</motion.div>
```

### 8.4 Custom Animations

```css
/* Bounce animation for floating elements */
@keyframes neo-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* Pulse animation for attention */
@keyframes neo-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Wiggle animation for playful elements */
@keyframes neo-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
```

### 8.5 Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Instant | 100ms | ease | Micro-interactions |
| Fast | 200ms | ease | Hover states, button clicks |
| Normal | 300ms | ease-out | Page transitions |
| Slow | 500ms | ease-in-out | Complex animations |

---

## 9. Layout Patterns

### 9.1 Page Background

```css
.page {
  background-color: #f0f0f0;
  min-height: 100vh;
}
```

### 9.2 Background Patterns

#### Grid Pattern
```css
.neo-grid-bg {
  background-image: 
    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

#### Dots Pattern
```css
.neo-dots-bg {
  background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

### 9.3 Section Containers

```css
/* White section with border */
.section-white {
  background-color: white;
  border-top: 2px solid black;
  border-bottom: 2px solid black;
}

/* Gray section (default) */
.section-gray {
  background-color: #f0f0f0;
}
```

### 9.4 Card Grid Layouts

```html
<!-- 3-column responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- cards -->
</div>

<!-- 2-column layout (editor) -->
<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div class="lg:col-span-2"><!-- editor --></div>
  <div class="lg:col-span-3"><!-- preview --></div>
</div>
```

### 9.5 Navbar

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background-color: white;
  border-bottom: 2px solid black;
}
```

### 9.6 Footer

```css
.footer {
  background-color: white;
  border-top: 2px solid black;
}

.footer-card {
  background-color: #fafafa;
  border: 2px solid black;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);
}
```

---

## 10. Brand Voice

### 10.1 Tone Attributes

| Attribute | Description |
|-----------|-------------|
| **Bold** | Confident, direct, impactful |
| **Professional** | Expert, reliable, trustworthy |
| **Friendly** | Approachable, supportive, encouraging |
| **Clear** | Direct, concise, jargon-free |

### 10.2 UI Copy Examples

| Element | Copy |
|---------|------|
| Primary CTA | "Build My Resume" or "Get Started" |
| Secondary CTA | "View Templates" |
| Export | "Open in Overleaf" |
| Empty State | "No resumes yet" |
| Success | "Your resume is ready!" |
| Error | "Something went wrong. Please try again." |

---

## 11. Implementation Reference

### 11.1 Key CSS Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS variables, utility classes, Neobrutalism foundations |
| `tailwind.config.ts` | Tailwind theme configuration |

### 11.2 CSS Utility Classes

```css
/* In globals.css */
.neo-shadow-sm { box-shadow: var(--neo-shadow-sm); }
.neo-shadow { box-shadow: var(--neo-shadow); }
.neo-shadow-lg { box-shadow: var(--neo-shadow-lg); }
.neo-shadow-xl { box-shadow: var(--neo-shadow-xl); }

.neo-border { border: 2px solid black; }
.neo-border-3 { border: 3px solid black; }

.neo-card { 
  @apply bg-white rounded-xl neo-border neo-shadow transition-all duration-200;
}

.neo-grid-bg { /* grid pattern */ }
.neo-dots-bg { /* dots pattern */ }

.text-gradient-vitex { /* brand gradient text */ }
```

### 11.3 Component Library

- **Base**: shadcn/ui components
- **Styling**: Tailwind CSS with Neobrutalism overrides
- **Icons**: Lucide React
- **Animation**: Framer Motion (for entrances only)

### 11.4 Icon Guidelines

- Use **Lucide React** icons exclusively
- Icon stroke width: 2px (default)
- Icon size in buttons: 16px (`h-4 w-4`)
- Icon size standalone: 20-24px (`h-5 w-5` or `h-6 w-6`)
- Icons in colored containers should use white fill

### 11.5 Responsive Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

---

## Appendix A: Component Quick Reference

### Button Classes

```tsx
// Primary
<Button variant="default">Primary</Button>

// Outline
<Button variant="outline">Outline</Button>

// Ghost
<Button variant="ghost">Ghost</Button>

// Accent (Cyan)
<Button variant="accent">Accent</Button>

// Destructive
<Button variant="destructive">Delete</Button>
```

### Card Example

```tsx
<Card className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] 
                hover:translate-x-[-2px] hover:translate-y-[-2px]">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description here</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

### Badge Variants

```tsx
<Badge variant="default">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="accent">Accent</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
```

---

## Appendix B: Migration from v1.0

### Breaking Changes in v2.0

1. **Removed dark mode** - Light-only Neobrutalism design
2. **New shadow system** - Hard shadows instead of soft
3. **Border requirements** - All interactive elements require borders
4. **Typography weights** - Increased use of `font-black` (900)
5. **Animation approach** - CSS hover instead of framer-motion for shadows

### Removed Features

- Dark mode toggle
- Soft shadow utilities
- Glass morphism effects
- Gradient backgrounds (except for brand text)

---

## Appendix C: Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Dec 2024 | Complete redesign with Neobrutalism system |
| 1.0.0 | Dec 2024 | Initial brand system creation |

---

**Document maintained by**: Vitex Team  
**Questions?** Open an issue on GitHub
