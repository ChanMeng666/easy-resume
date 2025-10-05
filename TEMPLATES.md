# Resume Templates

This document provides an overview of all available resume templates in Easy Resume.

## Template Overview

Easy Resume now offers **9 professional LaTeX resume templates** across 4 categories:

### 📊 Category Distribution

| Category | Templates | Description |
|----------|-----------|-------------|
| **Tech** | 4 | Technical positions, software engineering, IT |
| **Academic** | 2 | Research, education, academic positions |
| **Business** | 2 | Executive, finance, consulting, management |
| **Creative** | 1 | Design, creative industries, portfolio |

---

## All Templates

### Tech Templates

#### 1. Two-Column Layout
- **ID**: `two-column`
- **Style**: Professional two-column layout (60% / 40%)
- **Best for**: Software engineers, technical leads
- **Colors**: Blue tones (#0E5484, #2E86AB)
- **Layout**: Left column (experience, projects), Right column (education, skills)

#### 2. Modern CV
- **ID**: `modern-cv`
- **Style**: Modern minimalist single-column
- **Best for**: Tech professionals, startups
- **Colors**: Minimalist palette (#1a1a1a, #2563eb)
- **Layout**: Single column with clean typography

#### 3. Awesome CV
- **ID**: `awesome-cv`
- **Style**: Professional single-column inspired by posquit0's Awesome-CV
- **Best for**: Tech industry professionals
- **Colors**: Modern blue/teal (#007acc, #00a0a0)
- **Layout**: Clean single-column with elegant headers

#### 4. Compact One-Page
- **ID**: `compact`
- **Style**: Space-efficient single-page resume
- **Best for**: Entry-level, students, internships
- **Colors**: Simple clean palette (#0f172a, #0284c7)
- **Layout**: Compact 9pt font, narrow margins for maximum density
- **Special**: Optimized for fitting comprehensive information in one page

### Academic Templates

#### 5. Classic Academic
- **ID**: `classic`
- **Style**: Traditional academic CV
- **Best for**: Researchers, educators, formal academic positions
- **Colors**: Conservative black and blue
- **Layout**: Traditional single-column with serif typography

#### 6. Academic Research
- **ID**: `academic`
- **Style**: Comprehensive academic CV with multi-page support
- **Best for**: PhD candidates, postdocs, professors
- **Colors**: Academic blue (#blue!50!black)
- **Layout**: Detailed sections for publications and research
- **Special**: Supports multi-page content, includes references section

### Business Templates

#### 7. Executive Resume
- **ID**: `executive`
- **Style**: Professional executive resume with elegant design
- **Best for**: C-level executives, senior management, directors
- **Colors**: Deep blue and gold (#1e3a8a, #d97706)
- **Layout**: Single-column with emphasis on leadership achievements
- **Special**: Double titlerule for section headers, authoritative typography

#### 8. Banking & Finance
- **ID**: `banking`
- **Style**: Conservative professional resume
- **Best for**: Investment banking, consulting, finance analysts
- **Colors**: Traditional black and white
- **Layout**: Education-first layout, emphasis on metrics
- **Special**: Minimal color, focuses on content and achievements

### Creative Templates

#### 9. Creative Portfolio
- **ID**: `creative`
- **Style**: Bold sidebar design with vibrant colors
- **Best for**: Designers, creative directors, UX/UI designers
- **Colors**: Purple gradient (#7c3aed, #ec4899, #a855f7)
- **Layout**: Asymmetric 25% sidebar / 75% main content
- **Special**: Colored sidebar background, modern gradient palette

---

## Template Features

All templates support the following sections:
- ✅ Personal information with contact details
- ✅ Professional summary
- ✅ Work experience with highlights
- ✅ Education with GPA and coursework
- ✅ Projects with links and achievements
- ✅ Skills with categorization
- ✅ Achievements and awards
- ✅ Certifications
- ✅ Social profiles (LinkedIn, GitHub, etc.)

## Special Features by Template

| Feature | Templates |
|---------|-----------|
| Two-column layout | Two-Column, Creative Portfolio |
| Multi-page support | Academic Research |
| Compact layout | Compact One-Page |
| Sidebar design | Creative Portfolio |
| Color schemes | All except Banking & Finance |
| Icons | All templates |

## Using Templates

### In the Application

1. Visit the editor page
2. Select your preferred template from the dropdown
3. Edit your resume data
4. Preview the generated LaTeX code
5. Export to Overleaf or download

### Programmatically

```typescript
import { getTemplateById } from '@/templates/registry';
import { resumeData } from '@/data/resume';

// Get a specific template
const template = getTemplateById('executive');

// Generate LaTeX code
const latexCode = template.generator(resumeData);
```

## Template Customization

Each template is fully customizable through:
- **Colors**: Defined in preamble as `\definecolor{ColorName}{HTML}{hexcode}`
- **Fonts**: Change `\usepackage{lmodern}` to other font packages
- **Spacing**: Adjust `\titlespacing` and list spacing parameters
- **Layout**: Modify geometry margins and column ratios

## Adding New Templates

To add a new template:

1. Create a new directory in `src/templates/{template-id}/`
2. Create `metadata.ts` with template information
3. Create `generator.ts` with LaTeX generation logic
4. Create `index.ts` to export the template
5. Register in `src/templates/registry.ts`

See existing templates for reference implementation.

---

## LaTeX Compatibility

All templates use standard LaTeX packages and work on:
- ✅ Overleaf
- ✅ Local LaTeX installations (TeX Live, MiKTeX)
- ✅ Online LaTeX editors

### Required Packages

Common packages used across templates:
- `geometry` - Page layout and margins
- `xcolor` - Color definitions
- `fontawesome5` - Icons
- `hyperref` - Clickable links
- `enumitem` - List customization
- `titlesec` - Section formatting
- `lmodern` - Modern Latin fonts
- `paracol` - Multi-column layouts (two-column templates)

---

## Template Selection Guide

### Choose by Industry

- **Software/Tech**: Two-Column, Modern CV, Awesome CV, Compact
- **Academia**: Classic Academic, Academic Research
- **Business/Corporate**: Executive Resume, Banking & Finance
- **Creative**: Creative Portfolio

### Choose by Career Level

- **Entry-level/Students**: Compact One-Page, Modern CV
- **Mid-level**: Two-Column, Awesome CV, Classic Academic
- **Senior/Executive**: Executive Resume, Banking & Finance
- **Research/Academic**: Academic Research

### Choose by Style Preference

- **Colorful & Modern**: Creative Portfolio, Modern CV, Two-Column
- **Conservative & Professional**: Banking & Finance, Classic Academic
- **Balanced**: Executive Resume, Awesome CV

---

## Credits

Templates designed and implemented by the Easy Resume team, with inspiration from:
- **Awesome CV**: Inspired by [posquit0/Awesome-CV](https://github.com/posquit0/Awesome-CV)

All templates are free and open-source.
