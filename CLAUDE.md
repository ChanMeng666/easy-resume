# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vitex is a LaTeX-based resume generator built with Next.js 15, React 19, and TypeScript. The application generates professional LaTeX code from structured resume data and integrates with Overleaf for PDF compilation. It uses a **custom two-column layout** built with standard LaTeX packages for maximum compatibility.

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
- **Hero section**: Large headline with gradient text, animated floating badges
- **Features grid**: 3-column card grid with hover effects
- **Statistics section**: White banner with bordered stats
- **CTA section**: Final call-to-action with primary button

#### Templates Page (`src/app/templates/page.tsx`)
- Filter buttons with active state styling
- Template cards with preview iframe and hover overlay

#### Dashboard Page (`src/app/dashboard/page.tsx`)
- Tab navigation with Neobrutalism styling
- Resume cards grid with creation dialog

#### Editor Page (`src/app/editor/page.tsx`)
- Two-column layout (editor left, preview right)
- Toolbar with export buttons and template selector

### Preview Components
- **LatexPreview** (`src/components/preview/LatexPreview.tsx`): Displays generated LaTeX with Prism.js syntax highlighting
- **ExportButtons** (`src/components/preview/ExportButtons.tsx`): Three export actions (Overleaf, Copy, Download)

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
│   ├── page.tsx              # Marketing homepage
│   ├── layout.tsx            # Root layout with metadata
│   ├── globals.css           # Global styles and CSS variables
│   ├── api/
│   │   ├── copilotkit/route.ts  # CopilotKit runtime endpoint
│   │   └── ...               # Other API routes
│   ├── editor/
│   │   ├── page.tsx          # AI Editor page (with CopilotKit)
│   │   ├── AIEditorContent.tsx  # AI editor content component
│   │   └── manual/page.tsx   # Manual editor page (form-based)
│   └── templates/page.tsx    # Template gallery
├── components/
│   ├── copilot/              # CopilotKit AI components
│   │   └── AITextarea.tsx    # AI-enhanced textareas (React 19 compatible)
│   ├── editor/               # Resume editor components
│   ├── preview/              # LaTeX preview and export buttons
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── copilot/              # CopilotKit integration
│   │   ├── tools.ts          # AI actions (useCopilotAction hooks)
│   │   ├── instructions.ts   # AI system instructions
│   │   └── schemas.ts        # AI parameter schemas
│   ├── latex/
│   │   ├── generator.ts      # Main LaTeX code generation logic
│   │   └── utils.ts          # LaTeX formatting utilities
│   ├── overleaf/
│   │   └── api.ts            # Overleaf integration (POST form method)
│   ├── validation/
│   │   └── schema.ts         # Zod schemas for type validation
│   └── utils.ts              # General utilities (cn for className merging)
├── templates/                # LaTeX template system
│   ├── registry.ts           # Template registry
│   ├── types.ts              # Template type definitions
│   └── [template-name]/      # Individual templates
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

## CopilotKit Integration

The project integrates **CopilotKit** to provide AI-powered resume editing capabilities.

### Architecture

```
src/
├── app/api/copilotkit/route.ts    # CopilotKit runtime endpoint (GPT-4o)
├── lib/copilot/
│   ├── tools.ts                   # AI actions for resume manipulation
│   ├── instructions.ts            # AI system instructions
│   ├── schemas.ts                 # Zod schemas for AI parameters
│   ├── suggestions.ts             # AI suggestion generation
│   └── ...                        # Other AI utilities
├── components/copilot/
│   ├── AITextarea.tsx             # AI-enhanced textarea components
│   └── ...                        # Other AI UI components
```

### CopilotKit Features

1. **AI Chat Sidebar**: Users interact with AI to build/edit their resume conversationally
2. **Resume Manipulation Tools**: AI can add/update/remove work, education, skills, projects
3. **Template Switching**: AI can change templates based on user preference
4. **Readable Context**: AI has access to current resume data and available templates

### AI Tools (src/lib/copilot/tools.ts)

The following `useCopilotAction` hooks are registered:
- **updateBasicInfo**: Update name, title, email, phone, location, summary
- **addWorkExperience / updateWorkExperience / removeWorkExperience**: Manage work entries
- **addEducation / updateEducation / removeEducation**: Manage education entries
- **addSkillCategory / updateSkillCategory / removeSkillCategory**: Manage skill categories
- **addProject / updateProject / removeProject**: Manage project entries
- **addAchievement / removeAchievement**: Manage achievements
- **addCertification / removeCertification**: Manage certifications
- **selectTemplate**: Change the resume template
- **addSocialProfile / removeSocialProfile**: Manage social/professional profiles

### AI-Enhanced Textareas (src/components/copilot/AITextarea.tsx)

Provides intelligent autocomplete suggestions for:
- `AISummaryTextarea`: Professional summary writing
- `AIWorkHighlightTextarea`: Achievement bullet points with action verbs
- `AIProjectDescriptionTextarea`: Technical project descriptions
- `AIEducationNotesTextarea`: Coursework, honors, activities
- `AIGenericTextarea`: Generic AI-assisted text input

### Editor Modes

The editor has two modes accessible via different routes:
- **AI Editor** (`/editor`): Full AI-powered editing with chat sidebar
- **Manual Editor** (`/editor/manual`): Traditional form-based editing without AI

### React 19 Compatibility Fix

**Important**: The `@copilotkit/react-textarea` package was built for React 18 and has type incompatibilities with React 19. The fix is in `src/components/copilot/AITextarea.tsx`:

```typescript
// The CopilotTextarea component uses ForwardRefExoticComponent types
// that are incompatible with React 19's stricter JSX element types.
// Solution: Cast through 'unknown' to bypass type checking

import { CopilotTextarea as CopilotTextareaOriginal, CopilotTextareaProps } from "@copilotkit/react-textarea";

const CopilotTextarea = CopilotTextareaOriginal as unknown as React.FC<CopilotTextareaProps>;
```

This pattern is required whenever using `@copilotkit/react-textarea` with React 19.

### Environment Variables

CopilotKit requires:
```env
OPENAI_API_KEY=sk-...  # OpenAI API key for GPT-4o
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

4. **CopilotKit AI Integration (current)**:
   - **Added**: CopilotKit for AI-powered resume editing
   - **Features**: AI chat sidebar, conversational resume building, intelligent suggestions
   - **API**: `/api/copilotkit` endpoint using OpenAI GPT-4o
   - **Tools**: 20+ AI actions for resume manipulation
   - **Fix**: React 19 type compatibility via `as unknown as` cast pattern

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
