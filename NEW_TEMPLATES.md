# New Resume Templates

This document describes the 5 new LaTeX resume templates added to Easy Resume.

## Overview

All new templates are **two-column layouts** with unique designs and different column ratios, providing diverse visual styles while maintaining professional quality.

---

## 1. Sidebar Accent (25/75)

**Template ID**: `sidebar-accent`
**Category**: Tech
**Column Ratio**: 25% sidebar / 75% main content

### Design Features:
- **Colored sidebar** with teal/cyan background spanning full page height
- White text on colored background for high contrast
- Sidebar contains: Contact info, Skills, Education
- Main content area: Summary, Experience, Projects, Achievements

### Best For:
- Creative tech professionals
- Candidates who want visual impact
- Those with strong skill sets to highlight

### Color Scheme:
- Sidebar Background: `#0d9488` (Teal)
- Main Accent: `#0891b2` (Cyan)
- Text on sidebar: White

---

## 2. Timeline Dual-Column (50/50)

**Template ID**: `timeline-dual`
**Category**: Tech
**Column Ratio**: 50% / 50% symmetric

### Design Features:
- **Symmetric layout** with chronological timeline concept
- Left column: Work Experience Timeline
- Right column: Project Timeline
- Full-width header and footer sections
- Skills displayed as inline tags

### Best For:
- Developers with rich project portfolios
- Those who want to showcase work-project parallel progression
- Candidates with balanced experience and projects

### Color Scheme:
- Timeline Color: `#f97316` (Orange)
- Work Color: `#3b82f6` (Blue)
- Project Color: `#8b5cf6` (Purple)

---

## 3. Reverse Two-Column (40/60)

**Template ID**: `reverse-two-column`
**Category**: Business
**Column Ratio**: 40% sidebar / 60% main content

### Design Features:
- **Reversed layout** compared to standard two-column
- Light grey sidebar background
- Left sidebar (40%): Skills with colored badges, Education, Achievements, Certifications
- Right main area (60%): Summary, Experience, Projects
- Professional burgundy color scheme

### Best For:
- Business professionals
- Academic candidates
- Those who want to emphasize skills and qualifications

### Color Scheme:
- Primary: `#7f1d1d` (Dark Burgundy)
- Accent: `#991b1b` (Burgundy)
- Sidebar Background: `#f3f4f6` (Light Grey)

---

## 4. Card Grid Layout (50/50)

**Template ID**: `card-grid`
**Category**: Creative
**Column Ratio**: 50% / 50% with card-based design

### Design Features:
- **Modern card-based** modular design
- Each section presented as a styled card with:
  - Rounded corners
  - Light purple background
  - Colored left border accent
- Cards distributed across two columns
- Highly visual and modern appearance

### Best For:
- Creative professionals
- UI/UX designers
- Frontend developers
- Those seeking a contemporary look

### Color Scheme:
- Card Accent: `#8b5cf6` (Purple)
- Card Background: `#faf5ff` (Light Purple)
- Header: `#6d28d9` (Deep Purple)

---

## 5. Three-Section Column (30/70 Mixed)

**Template ID**: `three-section`
**Category**: Tech
**Layout**: Hybrid three-section design

### Design Features:
- **Section 1** (Top): Full-width gradient banner with name, title, contact
- **Section 2** (Middle): 30/70 two-column layout
  - Left 30%: Skills with badges, Education, Top Certifications
  - Right 70%: Summary, Experience, Projects
- **Section 3** (Bottom): Full-width achievements timeline
- Most complex and layered design

### Best For:
- Senior tech professionals
- Those with comprehensive experience
- Candidates who want a distinctive, premium look

### Color Scheme:
- Banner Gradient: `#1e40af` to `#3b82f6` (Blue gradient)
- Accent: `#60a5fa` (Light Blue)
- Sidebar Background: `#eff6ff` (Very Light Blue)

---

## Template Comparison

| Template | Ratio | Complexity | Best For | Visual Style |
|----------|-------|------------|----------|--------------|
| Sidebar Accent | 25/75 | Medium | Creative Tech | Bold colored sidebar |
| Timeline Dual | 50/50 | Medium | Tech with Projects | Symmetric chronological |
| Reverse Two-Column | 40/60 | Low | Business/Academic | Professional conservative |
| Card Grid | 50/50 | High | Creative | Modern modular cards |
| Three-Section | 30/70 | Very High | Senior Tech | Layered premium |

---

## Technical Implementation

All templates follow the same architecture:

```
src/templates/[template-name]/
├── index.ts           # Template export
├── metadata.ts        # Template metadata
└── generator.ts       # LaTeX generation logic
```

### Key Features:
- ✅ Full TypeScript type safety
- ✅ Support all ResumeData fields
- ✅ Standard LaTeX packages only (paracol, geometry, xcolor, etc.)
- ✅ Optimized for Overleaf compilation
- ✅ Responsive to different content lengths
- ✅ Professional typography and spacing

---

## Testing

All templates have been tested and verified to:
- Generate valid LaTeX code
- Compile successfully
- Handle all resume data fields
- Maintain consistent formatting
- Pass TypeScript type checking
- Build without errors

---

## Usage

Templates are automatically available in the template selector after registration in `src/templates/registry.ts`.

Users can:
1. Select template from dropdown
2. View LaTeX code preview with syntax highlighting
3. Export to Overleaf for PDF compilation
4. Download .tex file
5. Copy LaTeX code to clipboard
