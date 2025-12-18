# Vitex Brand Guidelines

> Official brand design system for Vitex - Your Career, Perfectly Composed

**Version**: 1.0.0
**Last Updated**: December 2024
**Status**: Active

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Visual Identity](#2-visual-identity)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Logo Usage](#5-logo-usage)
6. [UI Components](#6-ui-components)
7. [Motion & Animation](#7-motion--animation)
8. [Brand Voice](#8-brand-voice)
9. [Implementation Reference](#9-implementation-reference)

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

### 1.6 Brand Taglines

- **Primary**: "Your Career, Perfectly Composed"
- **Secondary**: "Professional LaTeX Resumes, Zero Learning Curve"
- **Technical**: "LaTeX Quality, Zero Complexity"

---

## 2. Visual Identity

### 2.1 Design Philosophy

Vitex's visual identity embodies:

- **Future-forward**: Modern gradients, glass morphism effects
- **Technical excellence**: Clean lines, precise spacing
- **Approachable professionalism**: Warm accents balanced with serious tones
- **Dynamic energy**: Subtle animations that convey progress and growth

### 2.2 Design Principles

1. **Clarity First**: Information hierarchy should be immediately clear
2. **Purposeful Color**: Every color serves a functional purpose
3. **Consistent Spacing**: Use the 4px/8px grid system
4. **Subtle Depth**: Layer with shadows and blur, not borders
5. **Responsive Grace**: Adapt elegantly across all screen sizes

---

## 3. Color System

### 3.1 Primary Colors

| Name | HEX | HSL | RGB | Usage |
|------|-----|-----|-----|-------|
| **Vitex Purple** | `#6C3CE9` | 258° 80% 57% | 108, 60, 233 | Primary brand color, buttons, links |
| **Vitex Purple Light** | `#8B5CF6` | 258° 90% 66% | 139, 92, 246 | Hover states, light backgrounds |
| **Vitex Purple Dark** | `#5521C9` | 258° 72% 46% | 85, 33, 201 | Active states, dark accents |

### 3.2 Accent Colors

| Name | HEX | HSL | RGB | Usage |
|------|-----|-----|-----|-------|
| **Electric Cyan** | `#00D4AA` | 166° 100% 42% | 0, 212, 170 | Success states, highlights, CTAs |
| **Electric Cyan Light** | `#34E7C0` | 166° 78% 55% | 52, 231, 192 | Secondary accents |

### 3.3 Neutral Colors

| Name | HEX | Usage |
|------|-----|-------|
| **Midnight** | `#0F0A1F` | Dark mode background |
| **Charcoal** | `#1A1625` | Dark mode cards |
| **Slate** | `#64748B` | Secondary text |
| **Silver** | `#E2E8F0` | Borders, dividers |
| **Snow** | `#F8FAFC` | Light mode background |
| **White** | `#FFFFFF` | Card backgrounds |

### 3.4 Semantic Colors

| Name | HEX | Usage |
|------|-----|-------|
| **Success** | `#10B981` | Success messages, confirmations |
| **Warning** | `#F59E0B` | Warning messages |
| **Error** | `#EF4444` | Error states, destructive actions |
| **Info** | `#3B82F6` | Informational messages |

### 3.5 Gradients

```css
/* Primary Brand Gradient - CTAs, Hero sections */
--gradient-primary: linear-gradient(135deg, #6C3CE9 0%, #00D4AA 100%);

/* Text Gradient - Headlines, highlights */
--gradient-text: linear-gradient(90deg, #6C3CE9 0%, #00D4AA 100%);

/* Glow Effect - Background accents */
--gradient-glow: radial-gradient(circle, rgba(108,60,233,0.15) 0%, rgba(0,212,170,0.05) 50%, transparent 70%);

/* Canvas Animation Colors */
--gradient-color-1: #8B5CF6;  /* Purple */
--gradient-color-2: #00D4AA;  /* Cyan */
--gradient-color-3: #1A1625;  /* Dark */
--gradient-color-4: #F8FAFC;  /* Light */
```

### 3.6 Color Usage Rules

1. **Primary actions** always use Vitex Purple
2. **Success/positive actions** use Electric Cyan
3. **Text gradients** only on headings, never body text
4. **Dark mode** inverts backgrounds but maintains color relationships
5. **Contrast ratio** must meet WCAG AA standards (4.5:1 minimum)

---

## 4. Typography

### 4.1 Font Stack

```css
/* Sans-serif (UI Text) */
font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace (Code) */
font-family: var(--font-geist-mono), 'SF Mono', 'Fira Code', 'Fira Mono', Consolas, monospace;
```

### 4.2 Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 48px / 3rem | Bold (700) | 1.1 | -0.025em |
| H2 | 32px / 2rem | Semibold (600) | 1.2 | -0.025em |
| H3 | 24px / 1.5rem | Semibold (600) | 1.3 | -0.025em |
| H4 | 20px / 1.25rem | Semibold (600) | 1.4 | normal |
| Body | 16px / 1rem | Regular (400) | 1.6 | normal |
| Small | 14px / 0.875rem | Regular (400) | 1.5 | normal |
| Caption | 12px / 0.75rem | Medium (500) | 1.4 | 0.025em |
| Code | 14px / 0.875rem | Regular (400) | 1.5 | normal |

### 4.3 Typography Rules

1. **Headlines** may use text gradients
2. **Body text** must be solid colors only
3. **Code blocks** always use monospace font
4. **Links** inherit text color with purple hover
5. **Maximum line length** is 75 characters for readability

---

## 5. Logo Usage

### 5.1 Logo Variants

| Variant | Usage | File |
|---------|-------|------|
| **Full Logo** | Primary usage, navigation | `vitex.svg` |
| **Icon Only** | Favicon, small spaces | `vitex-icon.svg` (future) |
| **Wordmark** | Text-only contexts | Text "Vitex" in brand font |

### 5.2 Current Logo Specification

```svg
<!-- Text-based gradient logo -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">
  <defs>
    <linearGradient id="vitexGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6C3CE9"/>
      <stop offset="100%" style="stop-color:#00D4AA"/>
    </linearGradient>
  </defs>
  <text x="0" y="24"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="28"
        font-weight="700"
        fill="url(#vitexGrad)">
    Vitex
  </text>
</svg>
```

### 5.3 Logo Clear Space

Maintain padding equal to the height of the "V" character around all sides.

### 5.4 Logo Color Variations

| Context | Treatment |
|---------|-----------|
| Light backgrounds | Gradient fill (default) |
| Dark backgrounds | Gradient fill or white |
| Single color required | Vitex Purple `#6C3CE9` |
| Grayscale | `#333333` or `#FFFFFF` |

### 5.5 Logo Don'ts

- Don't rotate or skew the logo
- Don't change the gradient colors
- Don't add drop shadows or effects
- Don't place on busy backgrounds
- Don't stretch or compress

---

## 6. UI Components

### 6.1 Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #6C3CE9 0%, #8B5CF6 100%);
  color: white;
  border-radius: 9999px;
  padding: 12px 32px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(108, 60, 233, 0.3);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(108, 60, 233, 0.4);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: #6C3CE9;
  border: 2px solid #6C3CE9;
  border-radius: 9999px;
  padding: 10px 30px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(108, 60, 233, 0.1);
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: currentColor;
  padding: 8px 16px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.btn-ghost:hover {
  color: #6C3CE9;
}
```

### 6.2 Cards

```css
.card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(108, 60, 233, 0.1);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(108, 60, 233, 0.08);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 32px rgba(108, 60, 233, 0.12);
  transform: translateY(-2px);
}

/* Dark mode */
.dark .card {
  background: rgba(26, 22, 37, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.2);
}
```

### 6.3 Inputs

```css
.input {
  background: white;
  border: 2px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  transition: all 0.2s ease;
}

.input:focus {
  border-color: #6C3CE9;
  outline: none;
  box-shadow: 0 0 0 3px rgba(108, 60, 233, 0.1);
}

.input::placeholder {
  color: #94A3B8;
}
```

### 6.4 Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(108, 60, 233, 0.1);
}

.dark .glass {
  background: rgba(26, 22, 37, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.2);
}
```

### 6.5 Badges & Tags

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 9999px;
  background: rgba(108, 60, 233, 0.1);
  color: #6C3CE9;
}

.tag {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  background: #F1F5F9;
  color: #64748B;
}
```

---

## 7. Motion & Animation

### 7.1 Timing Functions

```css
/* Standard ease - Most interactions */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

/* Ease out - Elements entering */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Ease in - Elements exiting */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Spring - Playful interactions */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### 7.2 Duration Scale

| Type | Duration | Usage |
|------|----------|-------|
| Instant | 100ms | Micro-interactions, hovers |
| Fast | 200ms | Button clicks, toggles |
| Normal | 300ms | Page transitions, modals |
| Slow | 500ms | Complex animations |

### 7.3 Standard Animations

```css
/* Fade in up - Page elements */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale in - Modals, popovers */
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Pulse - Loading, attention */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### 7.4 Hover Effects

1. **Buttons**: translateY(-2px) + shadow increase
2. **Cards**: translateY(-2px) + shadow increase
3. **Links**: Color transition to primary
4. **Icons**: scale(1.1) transformation

---

## 8. Brand Voice

### 8.1 Tone Attributes

| Attribute | Description |
|-----------|-------------|
| **Professional** | Expert, reliable, trustworthy |
| **Friendly** | Approachable, supportive, encouraging |
| **Clear** | Direct, concise, jargon-free |
| **Confident** | Assured, positive, empowering |

### 8.2 Writing Guidelines

**Do:**
- Use active voice
- Keep sentences concise
- Focus on user benefits
- Use "you" and "your"

**Don't:**
- Use technical jargon unnecessarily
- Write in passive voice
- Use superlatives excessively
- Make promises we can't keep

### 8.3 Key Messages

| Context | Message |
|---------|---------|
| **Value Proposition** | "Create professional LaTeX resumes without the complexity" |
| **Privacy** | "Your data stays in your browser - always" |
| **Cost** | "Free forever, no hidden fees" |
| **Ease** | "No LaTeX knowledge required" |
| **Quality** | "Professional typographic quality in minutes" |

### 8.4 UI Copy Examples

| Element | Copy |
|---------|------|
| Primary CTA | "Build My Resume" or "Start Building" |
| Secondary CTA | "View Templates" or "Browse Templates" |
| Export | "Open in Overleaf" |
| Empty State | "Let's create your first resume" |
| Success | "Your resume is ready!" |
| Error | "Something went wrong. Please try again." |

---

## 9. Implementation Reference

### 9.1 CSS Variables Location

All brand colors are defined in:
- `src/app/globals.css` - CSS custom properties
- `tailwind.config.ts` - Tailwind theme extension

### 9.2 Key Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS variables, global styles |
| `tailwind.config.ts` | Tailwind configuration |
| `public/vitex.svg` | Logo file |
| `src/app/layout.tsx` | Metadata, fonts |
| `docs/BRAND_GUIDELINES.md` | This document |

### 9.3 Component Library

UI components are built with:
- **shadcn/ui** - Base components
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### 9.4 Icon Guidelines

- Use **Lucide React** icons exclusively
- Icon stroke width: 1.5px - 2px
- Icon size in buttons: 16px (h-4 w-4)
- Icon size standalone: 20px - 24px
- Color: inherit from parent or explicit brand color

### 9.5 Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

---

## Appendix A: Color Accessibility

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| Purple on White | 4.6:1 | AA |
| White on Purple | 4.6:1 | AA |
| Cyan on Dark | 8.2:1 | AAA |
| Dark text on Light | 12.6:1 | AAA |

## Appendix B: Brand Assets Checklist

- [x] Primary logo (SVG)
- [ ] Icon logo (SVG) - Future
- [ ] Favicon set (ICO, PNG)
- [ ] Open Graph image (1200x630)
- [ ] App icons (various sizes)
- [x] Brand guidelines document

## Appendix C: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial brand system creation |

---

**Document maintained by**: Vitex Team
**Questions?** Open an issue on GitHub
