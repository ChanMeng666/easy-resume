# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vitex is a Typst-based resume generator built with Next.js 15, React 19, and TypeScript. The application generates professional Typst code from structured resume data and compiles PDFs locally using Typst. It uses a **custom two-column layout** built with Typst's grid system for maximum compatibility.

**Brand**: Vitex (formerly Easy Resume) - "Your Career, Perfectly Composed"

**Design System**: **Neobrutalism** - A bold, distinctive design aesthetic featuring:
- Thick black borders (2-3px) on all interactive elements
- Hard shadows (4-8px offset, solid black, no blur)
- Light gray background (#f0f0f0) with white cards
- High contrast, playful yet professional aesthetic
- No dark mode - single cohesive light theme

**Brand Guidelines**: See `docs/BRAND_GUIDELINES.md` for comprehensive brand design documentation including:
- Neobrutalism design principles and implementation
- Color system (Vitex Purple #6C3CE9, Electric Cyan #00D4AA)
- Typography specifications (font-black for headlines, font-bold for buttons)
- Shadow and border standards
- UI component styling with hover animations
- Logo usage guidelines
- Brand voice and tone

**Key Architecture Decision**: This project migrated from an HTML/CSS A4 resume builder to a Typst code generator. It uses Typst's built-in grid layout to create a professional two-column layout (60% left / 40% right) that compiles locally via the `typst` binary without requiring any external services.

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint

# Docker / VPS Deployment
# Docker build and GitHub Actions CI/CD deploy to DigitalOcean VPS
# See .github/workflows/deploy.yml and Dockerfile

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

## Typst Generation System

### Core Generator (`src/lib/typst/generator.ts`)
- **Main function**: `generateTypstCode(data: ResumeData): string`
- **Layout structure**:
  - Left column (60%): Introduction, Experience, Projects
  - Right column (40%): Education, Skills, Achievements, Certifications
  - Uses Typst `grid` with `columns: (60%, 40%)` for asymmetric columns
- **Sections generated**: Personal info with icons, summary, education, experience, projects, skills, achievements, certifications
- **Custom functions**: `cv-section`, `cv-event`, `cv-tag`, `cv-divider`, `cv-subsection`
- **Special handling**:
  - Unicode symbols for contact info and social profiles
  - Blue color scheme (PrimaryColor: #0E5484, AccentColor: #2E86AB)
  - Date formatting from resume data to human-readable ranges
  - Array-to-list conversion for bullet points
  - Skill tags displayed as colored boxes
  - Automatic certification categorization by keywords

### Typst Utilities (`src/lib/typst/utils.ts`)
- `escapeTypst()`: Critical function to escape special Typst characters (`\`, `*`, `_`, `` ` ``, `$`, `#`, `<`, `>`, `@`)
- `formatDateRange()`: Converts start/end dates to display format (uses en dash `–` instead of LaTeX `--`)
- `splitName()`: Handles name parsing for Typst formatting
- `cleanURL()`: Removes protocol from URLs for cleaner display

## PDF Compilation

### Local Typst Compilation (`src/app/api/compile/route.ts`)
- Compiles Typst code to PDF locally using the `typst` binary
- No external API dependencies — runs entirely on the VPS
- Compilation time: < 100ms per resume
- Temp files in `os.tmpdir()/vitex-typst/`, cleaned up after each request
- LRU cache for compiled PDFs (100 entries, 1-hour TTL)
- Typst binary path configurable via `TYPST_BIN` env var

### Client-side Export (`src/lib/typst/compiler.ts`)
- `compilePdf()`: Calls `/api/compile`, returns PDF blob with client-side caching
- `downloadTypFile()`: Download .typ source file
- `copyToClipboard()`: Copy Typst code to clipboard

## UI Components

### Design System: Neobrutalism

The UI follows a **Neobrutalism** design aesthetic with these key characteristics:

#### Core Style Rules
```css
/* Standard shadow sizes */
--neo-shadow-sm: 2px 2px 0px 0px rgba(0,0,0,0.9);   /* badges, small elements */
--neo-shadow: 4px 4px 0px 0px rgba(0,0,0,0.9);       /* cards, buttons, inputs */
--neo-shadow-lg: 6px 6px 0px 0px rgba(0,0,0,0.9);   /* hover states */
--neo-shadow-xl: 8px 8px 0px 0px rgba(0,0,0,0.9);   /* dialogs, hero elements */

/* Standard borders: always 2px solid black */
/* Standard border-radius: rounded-lg (8px) for buttons, rounded-xl (12px) for cards */
```

#### Utility Classes (in globals.css)
- `.neo-shadow`, `.neo-shadow-lg`, `.neo-shadow-xl` - Hard shadow utilities
- `.neo-border` - 2px solid black border
- `.neo-card` - Complete card styling with white bg, border, and shadow
- `.neo-grid-bg`, `.neo-dots-bg` - Background patterns

#### Hover Behavior Pattern
**Important**: Use CSS for hover shadows, NOT framer-motion `whileHover` with boxShadow (causes square shadows on rounded elements).

```tsx
// Correct: CSS hover classes
<Card className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] 
                hover:translate-x-[-2px] hover:translate-y-[-2px] 
                transition-all duration-200">

// Wrong: framer-motion boxShadow (ignores border-radius)
<motion.div whileHover={{ boxShadow: "8px 8px 0px 0px rgba(0,0,0,0.9)" }}>
```

### Page Structure

#### Homepage (`src/app/page.tsx`)
- **Product entry point**: JD textarea + background textarea + "Generate My Resume" button
- **How It Works**: 3-card grid (Paste JD → AI Generates → Download PDF)
- Uses sessionStorage to pass data to /editor

#### Editor Page (`src/app/editor/page.tsx`)
- **Result review page**: Shows AI generation progress, then PDF preview with actions
- **Progress state**: 7-step animated progress synced with backend SSE pipeline
- **Result state**: PDF preview + ATS score badge + matched skills + cover letter
- **Export actions**: Download PDF, Download .typ, Copy Code, Show Cover Letter
- **Refinement input**: Natural language feedback → re-runs pipeline

#### Dashboard Page (`src/app/dashboard/page.tsx`)
- **2-tab layout**: Resumes (card grid with CRUD) + Credits (balance, transactions, buy)
- Requires authentication

#### Pricing Page (`src/app/pricing/page.tsx`)
- Subscription tiers and credit packs

### Preview Components
- **LivePdfPreview** (`src/components/preview/LivePdfPreview.tsx`): Compiles Typst and displays PDF in iframe
- **LatexPreview** (`src/components/preview/LatexPreview.tsx`): Displays Typst source code with monospace formatting
- **ExportButtons** (`src/components/preview/ExportButtons.tsx`): Download .typ and Copy Code actions

### UI Library
- **shadcn/ui**: Pre-built components in `src/components/ui/` customized for Neobrutalism
- **Styling**: Tailwind CSS (light mode only, no dark mode)
- **Icons**: Lucide React icon library
- **Animation**: Framer Motion for page entrances and staggered reveals (NOT for hover shadows)

### Component Styling Quick Reference

| Component | Border | Shadow | Hover Shadow | Radius |
|-----------|--------|--------|--------------|--------|
| Button | 2px black | 4px 4px | 6px 6px | rounded-lg |
| Card | 2px black | 4px 4px | 6px 6px | rounded-xl |
| Input | 2px black | none | 4px 4px (focus) | rounded-lg |
| Dialog | 2px black | 8px 8px | - | rounded-xl |
| Badge | 2px black | 2px 2px | - | rounded-lg |
| Tabs | 2px black | 4px 4px | - | rounded-xl |

## File Organization

```
src/
├── app/
│   ├── page.tsx              # Product entry point (JD + background → generate)
│   ├── layout.tsx            # Root layout with metadata
│   ├── globals.css           # Global styles and CSS variables
│   ├── api/
│   │   ├── generate/route.ts # AI generation pipeline (SSE streaming)
│   │   ├── agent/chat/route.ts # Agent chat endpoint (Vercel AI SDK)
│   │   ├── compile/route.ts  # Local Typst → PDF compilation
│   │   ├── ai/suggest/route.ts # AI content suggestions
│   │   ├── resumes/          # Resume CRUD endpoints
│   │   ├── jd/               # Job description parsing endpoints
│   │   ├── tailor/           # Resume tailoring endpoints
│   │   ├── ats/              # ATS scoring endpoint
│   │   ├── cover-letter/     # Cover letter generation
│   │   ├── credits/          # Credit management + Stripe webhook
│   │   ├── applications/     # Application tracking
│   │   └── share/            # Public resume sharing
│   ├── editor/
│   │   ├── page.tsx          # Editor page wrapper
│   │   └── AIEditorContent.tsx # Result review + refinement UI
│   ├── dashboard/page.tsx    # Resumes + Credits management
│   ├── pricing/page.tsx      # Pricing tiers
│   ├── share/[token]/page.tsx # Public shared resume view
│   └── handler/[...stack]/   # Stack Auth pages
├── components/
│   ├── agent/                # AI agent chat components
│   ├── auth/                 # Authentication components
│   ├── dashboard/            # Resume cards, create dialog, share dialog
│   ├── preview/              # PDF preview, Typst code view, export buttons
│   ├── shared/               # Navbar, Footer
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── agent/                # AI agent modules
│   │   ├── jd-parser.ts      # Job description → structured ParsedJD
│   │   ├── background-parser.ts # Free text → structured ResumeData
│   │   ├── matching-engine.ts # Resume ↔ JD compatibility analysis
│   │   ├── resume-tailor.ts  # Tailors resume to match JD
│   │   ├── ats-scorer.ts     # ATS compatibility scoring
│   │   ├── cover-letter.ts   # Cover letter generation
│   │   └── template-selector.ts # Rule-based template selection
│   ├── typst/
│   │   ├── generator.ts      # Main Typst code generation
│   │   ├── utils.ts          # Typst formatting utilities
│   │   └── compiler.ts       # Client-side PDF compilation and export
│   ├── services/             # Database service layer
│   ├── db/                   # Drizzle ORM client + schema
│   ├── redis/                # Upstash Redis client
│   ├── stripe/               # Stripe client + checkout
│   ├── auth/                 # Stack Auth configuration
│   ├── validation/
│   │   └── schema.ts         # Zod schemas for type validation
│   └── utils.ts              # General utilities
├── templates/                # 7 Typst resume templates (one per industry bucket)
│   ├── registry.ts           # Template registry
│   ├── types.ts              # Template type definitions
│   └── [template-name]/      # Individual templates (metadata + generator)
└── data/
    └── resume.ts             # Sample resume data
```

## Important Implementation Notes

### Typst Special Character Escaping
Always use `escapeTypst()` from `src/lib/typst/utils.ts` when inserting user data into Typst code. This prevents compilation errors from special characters.

### Date Handling
Work and education entries use string dates (`"Mar 2025"`, `"PRESENT"`) rather than ISO format. The `formatDateRange()` function handles the display formatting.

### Social Profile Mapping
The generator maps common network names to Unicode symbols:
- `"LinkedIn"` → Unicode LinkedIn icon
- `"GitHub"` → Unicode GitHub icon
- `"Portfolio"` / other → Unicode globe icon

### Typst Template Customization
- Page setup: `#set page(paper: "a4")` with 10pt font size
- Layout: Two-column with `grid(columns: (60%, 40%))` for asymmetric layout
- Color scheme: Custom blue colors (PrimaryColor: #0E5484, AccentColor: #2E86AB)
- Margins: `left: 1.25cm, right: 1.25cm, top: 1.5cm, bottom: 1.5cm`
- Icons: Unicode symbols for social profiles and contact info
- Section formatting: Custom Typst functions with colored headers and horizontal rules

### Typst Built-in Features Used
Typst does not use external packages for basic functionality. All layout, color, typography, and linking features are built into the language:
- `grid`: Two-column layout with asymmetric widths
- `page`/`text`: Page margins, font size, and typography
- `link`: Clickable hyperlinks
- `list`: Bullet point lists
- `rect`/`box`: Colored boxes for skill tags

### Custom Functions Defined
- `cv-section(title)`: Section header with colored text and horizontal rule
- `cv-event(title, subtitle, date, location)`: Work/education entries
- `cv-divider()`: Horizontal line separator between entries
- `cv-tag(keyword)`: Colored box for skill tags
- `cv-subsection(heading)`: Uppercase subsection headers

## AI Generation Pipeline

The project uses a **full AI pipeline** for end-to-end resume generation.

### Pipeline Endpoint (`src/app/api/generate/route.ts`)
SSE streaming endpoint that runs 7 sequential steps:
1. **Parse JD** → `parseJobDescription()` extracts structured job requirements
2. **Parse Background** → `parseBackground()` converts free text to ResumeData
3. **Analyze Match** → `analyzeMatch()` scores resume↔JD compatibility
4. **Tailor Resume** → `tailorResume()` optimizes resume for the target role
5. **Score ATS** → `scoreATS()` evaluates ATS compatibility (0-100)
6. **Generate Cover Letter** → `generateCoverLetter()` creates tailored cover letter
7. **Generate Document** → `selectTemplate()` + template generator → Typst code

### Agent Modules (`src/lib/agent/`)
- **jd-parser.ts**: GPT-4o `generateObject` → ParsedJD (title, company, skills, keywords, requirements)
- **background-parser.ts**: GPT-4o `generateObject` → ResumeData from free-text description
- **matching-engine.ts**: Deterministic skill overlap + GPT-4o nuanced analysis → MatchAnalysis
- **resume-tailor.ts**: GPT-4o rewrites resume bullets, reorders skills, adjusts summary for JD
- **ats-scorer.ts**: GPT-4o evaluates formatting, keywords, experience, skills → ATSReport (0-100)
- **cover-letter.ts**: GPT-4o generates 3-4 paragraph professional cover letter
- **template-selector.ts**: Rule-based mapping of industry/level → template ID

### Agent Chat (`src/app/api/agent/chat/route.ts`)
- Uses Vercel AI SDK v6 with OpenAI GPT-4o
- 6 tools: updateResume, parseJobDescription, analyzeJobMatch, tailorResumeToJob, scoreATSCompatibility, generateCoverLetter
- Streaming UI message response with 5-step limit

### Environment Variables
```env
OPENAI_API_KEY=sk-...  # Required for all AI features
```

## Migration Context

This project underwent multiple architectural transformations:

1. **HTML/CSS to LaTeX (commit e6d3802)**:
   - **Removed**: ~3,800 lines of A4 layout/pagination code, Puppeteer PDF export, HTML/CSS rendering
   - **Added**: LaTeX generation system, Overleaf integration, Prism.js syntax highlighting
   - Fixed 414 Request-URI Too Large error by switching from GET to POST form submission

2. **moderncv to Custom Two-Column Layout**:
   - **Removed**: Single-column moderncv template, dependency on altacv.cls
   - **Added**: Custom two-column layout using article class and standard packages
   - **Benefits**: Works on all LaTeX platforms without additional files, full customization control
   - **Layout**: Left column (intro, experience, projects), Right column (education, skills, achievements, certifications)
   - **Packages**: Uses only standard packages (paracol, geometry, xcolor, fontawesome5, hyperref, enumitem, titlesec)

3. **UI Redesign to Neobrutalism (current)**:
   - **Removed**: Dark mode support, soft shadows, glass morphism effects, gradient backgrounds
   - **Added**: Bold Neobrutalism design system with:
     - Hard shadows (4-8px offset, solid black)
     - Thick black borders (2px) on all interactive elements
     - Light gray page background (#f0f0f0) with white cards
     - Framer Motion for entrance animations
     - CSS-based hover effects (not framer-motion boxShadow)
   - **Benefits**: Distinctive, memorable design that avoids generic "AI slop" aesthetic
   - **Key files modified**: All UI components, globals.css, all pages

4. **CopilotKit to Vercel AI SDK**:
   - **Removed**: CopilotKit (large bundle size exceeded Cloudflare 25MB limit)
   - **Added**: Vercel AI SDK for AI-powered resume editing
   - **Result**: Server-side bundle ~1.3 MB gzipped, compatible with Cloudflare Workers

5. **Railway to Cloudflare Workers to DigitalOcean VPS**:
   - **Removed**: Railway config, then Cloudflare Workers config (`wrangler.jsonc`, `@opennextjs/cloudflare`)
   - **Added**: Docker + GitHub Actions CI/CD to DigitalOcean VPS
   - **Refactored**: Per-request client factories back to singletons
   - **Key files**: `Dockerfile`, `.github/workflows/deploy.yml`

6. **LaTeX to Typst (current)**:
   - **Removed**: Entire LaTeX generation system, Overleaf integration, prismjs
   - **Added**: Typst generation system with local compilation
   - **Benefits**: < 100ms compilation (vs 5-15s LaTeX), single binary dependency, no external API, AI-friendlier syntax
   - **Key files**: `src/lib/typst/generator.ts`, `src/lib/typst/utils.ts`, `src/lib/typst/compiler.ts`

7. **UI/UX "Sell Results" Overhaul**:
   - **Removed**: Manual editor, template gallery, standalone tailor page, 20+ components
   - **Added**: Product-first homepage (JD+background input), result review editor (PDF preview + refinement)
   - **Benefits**: 3-step user flow (paste JD → generate → download PDF)

8. **AI Generation Pipeline**:
   - **Added**: Full 7-step SSE streaming pipeline, background parser, template selector
   - **Benefits**: End-to-end automated resume generation from free-text input
   - **Key files**: `src/app/api/generate/route.ts`, `src/lib/agent/background-parser.ts`, `src/lib/agent/template-selector.ts`

**Legacy reference**: `A4_RESUME_USAGE.md` documents the original HTML/CSS approach (not currently used)

## Type System

All types are inferred from Zod schemas using `z.infer<typeof schema>`. When modifying data structures:
1. Update the Zod schema in `src/lib/validation/schema.ts`
2. TypeScript types automatically update via type inference
3. Update Typst generator functions to handle new fields
4. Test with actual data in `src/data/resume.ts`

## Development Workflow

When adding new resume sections:
1. Update schema in `src/lib/validation/schema.ts`
2. Add data to `src/data/resume.ts`
3. Create generator function in `src/lib/typst/generator.ts`
4. Add section to `generateTypstCode()` sections array
5. Test Typst output by compiling locally

## Claude Code Preferences

### Language Requirements
- **UI Content**: All text in pages and components MUST be in English. No Chinese content allowed in the codebase.
- **Conversation**: Communicate with user in Chinese (Mandarin).
- **Code**: All code strings, comments, and documentation must be in English.
- **Function Comments**: Add function-level comments following Google Open Source style guide.

### Git Workflow
- **Commit Style**: Use Conventional Commits format following Angular specification.
- **GitHub CLI**: GitHub CLI is available for repository operations (use `gh` commands).
- **Commit Location**: Always verify current working directory is the project root (vitex) before committing.

### Testing Strategy
- Create functional tests in the project folder for every feature milestone.
- Test comprehensively before moving to next milestone.
- Use minimal tests to verify implementation effectiveness.
- Avoid creating extra documentation files unless explicitly requested.

### Code Quality Principles
1. **Problem-Solving**: Find the best solution, don't bypass problems. Tackle issues head-on.
2. **Efficiency**: Minimize code changes and use token-efficient implementations.
3. **Focus**: Stay laser-focused on user's task. Avoid extra/unnecessary work.
4. **Modularity**:
   - Decouple UI components, logic components, and data components
   - Break down components into smaller, granular pieces
   - Extract and reuse common logic
5. **Maintainability**: Ensure code is robust, extensible, and maintainable.

### UI Development Guidelines
1. **Follow Neobrutalism**: All new UI must use the Neobrutalism design system
2. **No Dark Mode**: Do not implement dark mode styling
3. **CSS for Hover Shadows**: Use Tailwind CSS classes for hover shadows, not framer-motion `whileHover` with boxShadow
4. **Avoid Hydration Mismatches**: Never use `Math.random()` or `Date.now()` in components that render on both server and client
5. **Consistent Shadows**: Use the standard shadow scale (2px/4px/6px/8px)
6. **Always Use Borders**: All interactive elements must have 2px black borders
7. **Framer Motion Usage**: Use for entrance animations and staggered reveals only

### Communication
- Explain actions clearly in conversation.
- Avoid verbose preambles unless requested.
- Keep explanations concise and relevant to the task.
