# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Easy Resume is a LaTeX-based resume generator built with Next.js 15, React 19, and TypeScript. The application generates professional LaTeX code from structured resume data and integrates with Overleaf for PDF compilation. It uses a **custom two-column layout** built with standard LaTeX packages for maximum compatibility.

**Key Architecture Decision**: This project migrated from an HTML/CSS A4 resume builder to a LaTeX code generator. It uses the article document class with custom commands to create a professional two-column layout (60% left / 40% right) that works on all LaTeX platforms including Overleaf without requiring additional template files.

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint

# Package management
npm install          # Install all dependencies
npx shadcn add <component>  # Add shadcn/ui components
```

## Data-Driven Architecture

### Resume Data Structure
- **Central data source**: All resume content is defined in `src/data/resume.ts`
- **Type safety**: Data structure validated using Zod schemas in `src/lib/validation/schema.ts`
- **Schema types**: `ResumeData`, `Basics`, `Education`, `Work`, `Project`, `Skill`, `Profile`

### Key Data Sections
- `basics`: Personal info, contact details, social profiles, optional photo
- `education`: Academic background with GPA and notes
- `work`: Employment history with date ranges and highlights
- `projects`: Portfolio projects with URLs and achievements
- `skills`: Categorized technical skills with keywords
- `achievements`: Notable awards and recognitions
- `certifications`: Professional certifications (automatically categorized)

## LaTeX Generation System

### Core Generator (`src/lib/latex/generator.ts`)
- **Main function**: `generateLatexCode(data: ResumeData): string`
- **Document class**: Uses standard `article` class with custom formatting
- **Layout structure**:
  - Left column (60%): Introduction, Experience, Projects
  - Right column (40%): Education, Skills, Achievements, Certifications
  - Uses `paracol` package with `\columnratio{0.6}` for asymmetric columns
- **Sections generated**: Personal info with icons, summary, education, experience, projects, skills, achievements, certifications
- **Custom commands**: `\cvname`, `\cvtitle`, `\cvcontact`, `\cvevent`, `\cvdivider`, `\cvtag`, `\cvsubsection`
- **Special handling**:
  - FontAwesome icons for contact info and social profiles
  - Blue color scheme (PrimaryColor: #0E5484, AccentColor: #2E86AB)
  - Date formatting from resume data to human-readable ranges
  - Array-to-itemize conversion for bullet points
  - Skill tags displayed as colored boxes
  - Automatic certification categorization by keywords

### LaTeX Utilities (`src/lib/latex/utils.ts`)
- `escapeLaTeX()`: Critical function to escape special LaTeX characters (`&`, `%`, `$`, `#`, `_`, `{`, `}`, `~`, `^`, `\`)
- `formatDateRange()`: Converts start/end dates to display format
- `splitName()`: Handles name parsing for LaTeX formatting
- `arrayToLatexItemize()`: Converts string arrays to LaTeX itemize environments
- `arrayToCompactItemize()`: Creates compact bullet lists with custom spacing
- `cleanURL()`: Removes protocol from URLs for cleaner display

## Overleaf Integration

### Core API (`src/lib/overleaf/api.ts`)
- **Primary method**: `openInOverleaf(latexCode, options)` - Uses POST form submission to avoid 414 URL length errors
- **Form submission approach**: Creates hidden form with `encoded_snip` parameter, submits to `https://www.overleaf.com/docs`
- **Engine options**: `pdflatex` (default), `xelatex`, `lualatex`, `latex_dvipdf`
- **Alternative exports**:
  - `downloadTexFile()`: Download .tex file locally
  - `copyToClipboard()`: Copy LaTeX code to clipboard

### Why POST Instead of GET
The previous GET URL approach (`snip_uri` with data URL) failed with 414 errors for large resumes. The POST form method with `encoded_snip` parameter successfully handles documents of any size.

## UI Components

### Page Structure (`src/app/page.tsx`)
- **Client component**: Uses `'use client'` directive for React hooks
- **Layout**: Two-column grid (2/5 split) - left shows resume info summary, right shows LaTeX preview and export
- **Key features**: Real-time LaTeX generation using `useMemo` hook, syntax-highlighted code preview

### Preview Components
- **LatexPreview** (`src/components/preview/LatexPreview.tsx`): Displays generated LaTeX with Prism.js syntax highlighting
- **ExportButtons** (`src/components/preview/ExportButtons.tsx`): Three export actions (Overleaf, Copy, Download)

### UI Library
- **shadcn/ui**: Pre-built components in `src/components/ui/` (button, input, textarea, accordion, tabs, card, label)
- **Styling**: Tailwind CSS with custom dark mode support
- **Icons**: Lucide React icon library

## File Organization

```
src/
├── app/
│   ├── page.tsx              # Main application page (LaTeX generator UI)
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles and CSS variables
├── components/
│   ├── preview/              # LaTeX preview and export buttons
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── latex/
│   │   ├── generator.ts      # Main LaTeX code generation logic
│   │   └── utils.ts          # LaTeX formatting utilities
│   ├── overleaf/
│   │   └── api.ts            # Overleaf integration (POST form method)
│   ├── validation/
│   │   └── schema.ts         # Zod schemas for type validation
│   └── utils.ts              # General utilities (cn for className merging)
└── data/
    └── resume.ts             # Resume content data (main editing file)
```

## Important Implementation Notes

### LaTeX Special Character Escaping
Always use `escapeLaTeX()` from `src/lib/latex/utils.ts` when inserting user data into LaTeX code. This prevents compilation errors from special characters.

### Date Handling
Work and education entries use string dates (`"Mar 2025"`, `"PRESENT"`) rather than ISO format. The `formatDateRange()` function handles the display formatting.

### Social Profile Mapping
The generator maps common network names to FontAwesome icons:
- `"LinkedIn"` → `\faLinkedin`
- `"GitHub"` → `\faGithub`
- `"Portfolio"` / other → `\faGlobe`

### LaTeX Template Customization
- Document class: `\documentclass[10pt,a4paper]{article}`
- Layout: Two-column with `\columnratio{0.6}` (60/40 split) using `paracol` package
- Fonts: Latin Modern (lmodern package)
- Color scheme: Custom blue colors (PrimaryColor: #0E5484, AccentColor: #2E86AB)
- Margins: `left=1.25cm, right=1.25cm, top=1.5cm, bottom=1.5cm`
- Icons: FontAwesome 5 for social profiles and contact info
- Section formatting: Custom `titlesec` settings with colored headers and horizontal rules

### Key Packages Used
- `geometry`: Page margins and layout
- `xcolor`: Color definitions and usage
- `fontawesome5`: Icons for contact info and social profiles
- `hyperref`: Clickable links
- `paracol`: Two-column layout with asymmetric widths
- `enumitem`: Customized list formatting
- `titlesec`: Custom section header styling

### Custom Commands Defined
- `\cvname{name}`: Large bold name in header
- `\cvtitle{title}`: Professional title below name
- `\cvcontact{info}`: Contact information line with icons
- `\cvevent{title}{subtitle}{date}{location}`: Work/education entries
- `\cvdivider`: Horizontal line separator between entries
- `\cvtag{keyword}`: Colored box for skill tags
- `\cvsubsection{heading}`: Uppercase subsection headers

## Migration Context

This project underwent multiple architectural transformations:

1. **HTML/CSS to LaTeX (commit e6d3802)**:
   - **Removed**: ~3,800 lines of A4 layout/pagination code, Puppeteer PDF export, HTML/CSS rendering
   - **Added**: LaTeX generation system, Overleaf integration, Prism.js syntax highlighting
   - Fixed 414 Request-URI Too Large error by switching from GET to POST form submission

2. **moderncv to Custom Two-Column Layout (current)**:
   - **Removed**: Single-column moderncv template, dependency on altacv.cls
   - **Added**: Custom two-column layout using article class and standard packages
   - **Benefits**: Works on all LaTeX platforms without additional files, full customization control
   - **Layout**: Left column (intro, experience, projects), Right column (education, skills, achievements, certifications)
   - **Packages**: Uses only standard packages (paracol, geometry, xcolor, fontawesome5, hyperref, enumitem, titlesec)

**Legacy reference**: `A4_RESUME_USAGE.md` documents the original HTML/CSS approach (not currently used)

## Type System

All types are inferred from Zod schemas using `z.infer<typeof schema>`. When modifying data structures:
1. Update the Zod schema in `src/lib/validation/schema.ts`
2. TypeScript types automatically update via type inference
3. Update LaTeX generator functions to handle new fields
4. Test with actual data in `src/data/resume.ts`

## Development Workflow

When adding new resume sections:
1. Update schema in `src/lib/validation/schema.ts`
2. Add data to `src/data/resume.ts`
3. Create generator function in `src/lib/latex/generator.ts`
4. Add section to `generateLatexCode()` sections array
5. Test LaTeX output in Overleaf
