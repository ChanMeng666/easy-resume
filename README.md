<div align="center"><a name="readme-top"></a>

[![Project Banner](./public/easy-resume.svg)](#)

# 🚀 Easy Resume<br/><h3>Professional LaTeX Resume Generator</h3>

A modern, browser-based LaTeX resume generator with visual editing and real-time preview.<br/>
Built with Next.js 15, React 19, and TypeScript.<br/>
Create your **FREE** professional LaTeX resume in minutes.

[Live Demo][demo-link] · [Documentation][docs-link] · [Report Bug][github-issues-link] · [Request Feature][github-issues-link]

<br/>

[![🎯 Try It Now! 🎯](https://gradient-svg-generator.vercel.app/api/svg?text=%F0%9F%9A%80Visit%20Live%20Site%F0%9F%9A%80&color=000000&height=60&gradientType=radial&duration=6s&color0=ffffff&template=pride-rainbow)][demo-link]

<br/>

<!-- SHIELD GROUP -->

[![][github-release-shield]][github-release-link]
[![][vercel-shield]][vercel-link]
[![][github-stars-shield]][github-stars-link]
[![][github-forks-shield]][github-forks-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]

**Share Easy Resume**

[![][share-x-shield]][share-x-link]
[![][share-linkedin-shield]][share-linkedin-link]
[![][share-reddit-shield]][share-reddit-link]

<sup>🌟 Generate professional LaTeX resumes with modern web technology. Designed for developers and professionals worldwide.</sup>

</div>

> [!IMPORTANT]
> This project is a **LaTeX resume generator** with a multi-page architecture featuring a marketing homepage, template gallery, and visual editor. It generates professional LaTeX code using **custom two-column layouts** and standard packages for maximum compatibility across all LaTeX platforms including Overleaf.

<details>
<summary><kbd>📑 Table of Contents</kbd></summary>

#### TOC

- [🚀 Easy Resume](#-easy-resume)
      - [TOC](#toc)
  - [🌟 Introduction](#-introduction)
  - [✨ Key Features](#-key-features)
    - [`1` Visual Resume Editor](#1-visual-resume-editor)
    - [`2` LaTeX Code Generation](#2-latex-code-generation)
    - [`3` Overleaf Integration](#3-overleaf-integration)
    - [`*` Additional Features](#-additional-features)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🏗️ Architecture](#️-architecture)
    - [Component Structure](#component-structure)
    - [Data Flow](#data-flow)
  - [⚡️ Performance](#️-performance)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Quick Installation](#quick-installation)
    - [Development Mode](#development-mode)
  - [🛳 Deployment](#-deployment)
    - [`A` Cloud Deployment](#a-cloud-deployment)
    - [`B` Docker Deployment](#b-docker-deployment)
  - [📖 Usage Guide](#-usage-guide)
    - [Visual Editor](#visual-editor)
    - [Export Options](#export-options)
    - [Data Management](#data-management)
  - [🎨 Customization](#-customization)
    - [LaTeX Template](#latex-template)
    - [Styling](#styling)
    - [Adding New Sections](#adding-new-sections)
  - [⌨️ Development](#️-development)
    - [Local Development](#local-development)
    - [Project Structure](#project-structure)
    - [Adding Features](#adding-features)
  - [🤝 Contributing](#-contributing)
    - [Development Process](#development-process)
    - [Contribution Guidelines](#contribution-guidelines)
  - [📄 License](#-license)
  - [👥 Contact](#-contact)

####

<br/>

</details>

## 🌟 Introduction

Easy Resume is a modern, browser-based LaTeX resume generator designed for professionals who want to create beautiful, professional resumes using the power of LaTeX. Built with Next.js 15, React 19, and TypeScript, this multi-page application features a marketing homepage, template gallery, and visual editor with real-time LaTeX code generation and one-click Overleaf integration.

**No LaTeX knowledge required!** Edit your resume using an intuitive visual editor, choose from multiple professional templates, and the application automatically generates LaTeX code using **custom two-column layouts** built with standard packages. Export to Overleaf for instant PDF compilation, or download the .tex file for local compilation.

> [!NOTE]
> - Node.js >= 18.0 required for development
> - Free Overleaf account recommended for PDF compilation
> - All data stored locally in your browser

| [![][demo-shield-badge]][demo-link]   | No installation required! Visit our live demo to create your resume now.                           |
| :------------------------------------ | :--------------------------------------------------------------------------------------------- |

> [!TIP]
> **⭐ Star us** to receive all release notifications from GitHub without delay!

[![][image-star]][github-stars-link]

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="./public/screenshots/屏幕截图 2025-09-07 155124.png" alt="Easy Resume Preview 1" width="400"/>
        <br><em>Visual Editor - Edit Resume Data</em>
      </td>
      <td align="center">
        <img src="./public/screenshots/屏幕截图 2025-09-07 155140.png" alt="Easy Resume Preview 2" width="400"/>
        <br><em>LaTeX Preview - Real-time Code Generation</em>
      </td>
    </tr>
  </table>
</div>

## ✨ Key Features

### `1` Visual Resume Editor

Experience a modern, form-based resume editor that eliminates the need to edit code files directly. Our intuitive interface makes resume creation accessible to everyone.

Key capabilities include:
- 📝 **No Code Editing**: Form-based visual editor for all sections
- 🔄 **Real-time Updates**: See LaTeX code update as you type
- 💾 **Auto-save**: Automatic localStorage persistence
- 🎯 **Dynamic Fields**: Add/remove entries for work, education, projects
- ✨ **Validation**: Built-in form validation with Zod schemas

[![][back-to-top]](#readme-top)

### `2` LaTeX Code Generation

Automatic LaTeX code generation using **custom two-column layouts** built with standard packages. No LaTeX knowledge required!

Features:
- 📄 **Custom Two-Column Layout**: Professional asymmetric layout (60% left / 40% right) using `paracol` package
- 🎨 **Professional Styling**: Custom commands with blue color scheme (PrimaryColor: #0E5484, AccentColor: #2E86AB)
- 🔤 **Smart Formatting**: Automatic date formatting and list generation
- 🛡️ **Special Character Escaping**: Safe handling of LaTeX special characters
- 📊 **All Sections Supported**: Personal info, education, work, projects, skills, achievements, certifications
- 🔧 **Maximum Compatibility**: Uses only standard packages - works on all LaTeX platforms without additional template files

[![][back-to-top]](#readme-top)

### `3` Overleaf Integration

Seamless integration with Overleaf for instant PDF compilation. Three export methods available:

- 🚀 **One-Click Overleaf**: Open directly in Overleaf for PDF compilation
- 📋 **Copy to Clipboard**: Copy LaTeX code for manual pasting
- 💾 **Download .tex File**: Save LaTeX file for local compilation

> ✨ The Overleaf integration uses POST form submission to avoid URL length limitations, supporting resumes of any size.

[![][back-to-top]](#readme-top)

### `*` Additional Features

Beyond the core features, this project includes:

- [x] 🏠 **Multi-Page Architecture**: Marketing homepage (`/`), template gallery (`/templates`), and editor (`/editor`)
- [x] 🎭 **Template System**: Extensible template registry with multiple professional LaTeX templates
- [x] 🎨 **Modern UI/UX**: Beautiful design with shadcn/ui components
- [x] 🔧 **Type-Safe**: Built with TypeScript and Zod validation
- [x] ⚡ **Performance Optimized**: Next.js 15 with automatic optimizations and code splitting
- [x] 📱 **Responsive Design**: Works perfectly on all devices
- [x] 🌐 **SEO Ready**: Optimized meta tags and semantic HTML
- [x] 🎯 **Syntax Highlighting**: Prism.js for beautiful code preview
- [x] 💾 **Data Import/Export**: Backup and restore resume data as JSON
- [x] 🔄 **Template Switching**: Real-time template switching with URL parameter support
- [x] 🚀 **One-Click Deploy**: Instant deployment to Vercel or other platforms

> ✨ The project demonstrates modern React/Next.js development practices with LaTeX integration and extensible template architecture.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🛠️ Tech Stack

<div align="center">
  <table>
    <tr>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/nextdotjs" width="48" height="48" alt="Next.js" />
        <br>Next.js 15
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/react" width="48" height="48" alt="React" />
        <br>React 19
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/typescript" width="48" height="48" alt="TypeScript" />
        <br>TypeScript 5
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/tailwindcss" width="48" height="48" alt="Tailwind CSS" />
        <br>Tailwind CSS
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/vercel" width="48" height="48" alt="Vercel" />
        <br>Vercel
      </td>
    </tr>
  </table>
</div>

**Frontend Stack:**
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with Hooks
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: React Hook Form + Zod validation
- **Syntax Highlighting**: Prism.js for LaTeX code
- **Icons**: Lucide React icon library

**Development Tools:**
- **Linting**: ESLint with Next.js configuration
- **Code Quality**: TypeScript strict mode
- **Build System**: Next.js optimized builds
- **Dev Server**: Next.js development server with hot reload

**Deployment & Hosting:**
- **Platform**: Vercel (recommended) / Netlify / Any static host
- **Build**: Optimized production builds
- **Performance**: Automatic optimization and caching

> [!TIP]
> Each technology was selected for production readiness, developer experience, and modern web standards compliance.

## 🏗️ Architecture

### Component Structure

```
src/
├── app/
│   ├── globals.css           # Global styles and Prism.js theme
│   ├── layout.tsx            # Root layout with metadata
│   ├── page.tsx              # Marketing homepage
│   ├── editor/
│   │   ├── page.tsx          # Editor main page
│   │   └── EditorContent.tsx # Editor content component
│   └── templates/
│       └── page.tsx          # Template gallery page
├── templates/                # Template system (NEW)
│   ├── types.ts              # Template type definitions
│   ├── registry.ts           # Template registry
│   ├── two-column/           # Custom two-column template
│   ├── modern-cv/            # Modern CV template
│   ├── classic/              # Classic academic template
│   └── awesome-cv/           # Awesome CV template
├── components/
│   ├── shared/               # Shared components
│   │   ├── Navbar.tsx        # Navigation bar
│   │   └── Footer.tsx        # Footer component
│   ├── editor/               # Visual resume editor components
│   │   ├── ResumeEditor.tsx  # Main editor container
│   │   ├── TemplateSelector.tsx  # Template selector (NEW)
│   │   └── sections/         # Section-specific editors
│   │       ├── BasicsEditor.tsx
│   │       ├── EducationEditor.tsx
│   │       ├── WorkEditor.tsx
│   │       ├── ProjectsEditor.tsx
│   │       ├── SkillsEditor.tsx
│   │       └── ListEditor.tsx
│   ├── preview/              # LaTeX preview components
│   │   ├── LatexPreview.tsx  # Syntax-highlighted code preview
│   │   └── ExportButtons.tsx # Export action buttons
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── latex/
│   │   ├── generator.ts      # LaTeX code generation engine
│   │   └── utils.ts          # LaTeX utility functions
│   ├── overleaf/
│   │   └── api.ts            # Overleaf integration (POST method)
│   ├── validation/
│   │   └── schema.ts         # Zod validation schemas
│   └── utils.ts              # General utilities
├── hooks/
│   └── useResumeData.ts      # Resume data state management
├── data/
│   └── resume.ts             # Default resume data
└── config/
    └── content-config.ts     # Content configuration
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant H as Homepage
    participant T as Template Gallery
    participant E as Visual Editor
    participant R as Template Registry
    participant S as State (localStorage)
    participant G as LaTeX Generator
    participant O as Overleaf

    U->>H: Visit Homepage
    H->>T: Browse Templates
    U->>T: Select Template
    T->>E: Navigate to Editor (?template=xxx)
    U->>E: Edit Resume Data
    E->>S: Save to localStorage
    U->>E: Switch Template (Optional)
    E->>R: Get Template by ID
    R->>G: Call Template Generator
    G->>E: Display LaTeX Preview
    U->>O: Click "Open in Overleaf"
    O->>U: Open PDF in New Tab
```

## ⚡️ Performance

**Key Metrics:**
- ⚡ **< 100ms** Time to First Byte (TTFB)
- 🚀 **< 500ms** First Contentful Paint
- 💨 **< 1s** Largest Contentful Paint
- 📊 **0ms** Cumulative Layout Shift
- 🔄 **Instant** LaTeX code generation

**Performance Optimizations:**
- 🎯 **React useMemo**: Optimized LaTeX generation
- 📦 **Code Splitting**: Automatic by Next.js
- 🔄 **localStorage**: Fast local data persistence
- 🖼️ **CSS Optimization**: Minimal CSS with Tailwind purging
- 📱 **Mobile Performance**: Optimized for all devices

> [!NOTE]
> Performance metrics are measured using Lighthouse and continuously optimized for the best user experience.

## 🚀 Getting Started

### Prerequisites

> [!IMPORTANT]
> Ensure you have the following installed:

- Node.js 18.0+ ([Download](https://nodejs.org/))
- npm/yarn/pnpm package manager
- Git ([Download](https://git-scm.com/))

### Quick Installation

**1. Clone Repository**

```bash
git clone https://github.com/ChanMeng666/easy-resume.git
cd easy-resume
```

**2. Install Dependencies**

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm (recommended)
pnpm install
```

**3. Start Development**

```bash
npm run dev
```

🎉 **Success!** Open [http://localhost:3000](http://localhost:3000) to start creating your resume.

### Development Mode

```bash
# Start with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## 🛳 Deployment

> [!IMPORTANT]
> Choose the deployment strategy that best fits your needs. Cloud deployment is recommended for easy sharing and updates.

### `A` Cloud Deployment

**Vercel (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Feasy-resume)

**Manual Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Other Platforms:**

<div align="center">

|           Deploy with Netlify            |                     Deploy with Railway                      |
| :-------------------------------------: | :---------------------------------------------------------: |
| [![][deploy-netlify-button]][deploy-netlify-link] | [![][deploy-railway-button]][deploy-railway-link] |

</div>

### `B` Docker Deployment

```bash
# Build Docker image
docker build -t easy-resume .

# Run container
docker run -p 3000:3000 easy-resume
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

## 📖 Usage Guide

### Visual Editor

**Getting Started:**

1. **Open the Application** in your browser
2. **Use the Visual Editor** on the left to edit your resume
3. **See Real-time Preview** of LaTeX code on the right
4. **Export to Overleaf** or download .tex file

**Editor Features:**

- **Personal Information**: Name, title, contact details, social profiles
- **Education**: Schools, degrees, GPA, honors
- **Work Experience**: Companies, positions, dates, achievements
- **Projects**: Project names, URLs, descriptions, highlights
- **Skills**: Categorized technical and professional skills
- **Achievements**: Awards and recognitions
- **Certifications**: Professional certifications and licenses

### Export Options

**Three ways to get your PDF resume:**

1. **Open in Overleaf** (Recommended)
   - Click "Open in Overleaf" button
   - Free Overleaf account required
   - Instant PDF compilation
   - Edit LaTeX directly if needed

2. **Copy to Clipboard**
   - Click "Copy Code" button
   - Paste into any LaTeX editor
   - Compile locally or online

3. **Download .tex File**
   - Click "Download .tex" button
   - Compile with LaTeX locally
   - Full control over compilation

### Data Management

**Backup and Restore:**

```typescript
// Export resume data as JSON
Click "Export JSON" button → Save backup file

// Import resume data from JSON
Click "Import JSON" button → Select backup file

// Reset to example data
Click "Reset to Example" button → Restore default resume

// Clear all data
Click "Clear Data" button → Remove all stored data
```

> [!TIP]
> Export your resume data regularly to avoid losing your work!

## 🎨 Customization

### LaTeX Template

The application uses **custom two-column layouts** built with standard LaTeX packages. Default template configuration:

```latex
\documentclass[10pt,a4paper]{article}
\usepackage[left=1.25cm,right=1.25cm,top=1.5cm,bottom=1.5cm]{geometry}
\usepackage{paracol}
\columnratio{0.6}  % 60% left column, 40% right column

% Custom colors
\definecolor{PrimaryColor}{HTML}{0E5484}
\definecolor{AccentColor}{HTML}{2E86AB}
```

**To customize templates:**

1. **Choose a Template**: Browse available templates at `/templates` or select in editor
2. **Modify Existing Template**: Edit files in `src/templates/{template-name}/generator.ts`
3. **Create New Template**: Follow the template system architecture (see below)
4. **Customize Colors**: Update color definitions in template preamble
5. **Adjust Layout**: Modify `\columnratio` or switch to single-column layout

### Styling

**CSS Variables Approach:**

```css
:root {
  --background: #f5f5f5;
  --foreground: #171717;
  --primary-main: #2563eb;
  --primary-light: #3b82f6;
  --primary-dark: #1d4ed8;
}
```

**shadcn/ui Theming:**

```bash
# Add new components
npx shadcn add <component-name>

# Customize in components/ui/
# Modify Tailwind config in tailwind.config.ts
```

### Adding New Templates

The application uses an extensible template registry system. Adding a new template requires 4 files:

**1. Create Template Directory:**

```bash
mkdir -p src/templates/your-template
```

**2. Define Template Metadata** (`metadata.ts`):

```typescript
import { TemplateMetadata } from '../types';

export const yourTemplateMetadata: TemplateMetadata = {
  id: 'your-template',
  name: 'Your Template Name',
  description: 'Template description',
  category: 'tech', // 'tech' | 'academic' | 'business' | 'creative'
  tags: ['modern', 'professional'],
  isPremium: false,
  previewImage: '/templates/your-template-preview.png',
};
```

**3. Create LaTeX Generator** (`generator.ts`):

```typescript
import { ResumeData } from '@/lib/validation/schema';
import { escapeLaTeX } from '@/lib/latex/utils';

export function generateYourTemplate(data: ResumeData): string {
  // Implement LaTeX code generation logic
  return `
    \\documentclass[11pt,a4paper]{article}
    % Your custom LaTeX code
  `;
}
```

**4. Create Template Entry Point** (`index.ts`):

```typescript
import { Template } from '../types';
import { yourTemplateMetadata } from './metadata';
import { generateYourTemplate } from './generator';

const yourTemplate: Template = {
  metadata: yourTemplateMetadata,
  generator: generateYourTemplate,
};

export default yourTemplate;
```

**5. Register Template** (in `src/templates/registry.ts`):

```typescript
import yourTemplate from './your-template';

constructor() {
  // ... existing templates
  this.register(yourTemplate);
}
```

✅ Done! Your template will automatically appear in the template gallery and editor selector.

## ⌨️ Development

### Local Development

**Setup Development Environment:**

```bash
# Clone repository
git clone https://github.com/ChanMeng666/easy-resume.git
cd easy-resume

# Install dependencies
npm install

# Start development server
npm run dev
```

**Development Scripts:**

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Project Structure

**Key Files and Directories:**

- `src/app/page.tsx` - Marketing homepage
- `src/app/editor/page.tsx` - Editor page with template selector
- `src/app/templates/page.tsx` - Template gallery page
- `src/templates/` - Template system (registry, types, and all templates)
- `src/lib/latex/generator.ts` - Core LaTeX utilities (moved to templates)
- `src/lib/overleaf/api.ts` - Overleaf integration with POST method
- `src/hooks/useResumeData.ts` - Resume data state management
- `src/components/shared/` - Shared components (Navbar, Footer)
- `src/components/editor/` - Visual editor components
- `src/components/preview/` - LaTeX preview and export

### Adding Features

**Feature Development Workflow:**

```mermaid
flowchart TD
    A[Identify Feature Need] --> B[Create Feature Branch]
    B --> C[Update Schema if Needed]
    C --> D[Develop Components]
    D --> E[Update LaTeX Generator]
    E --> F[Test Changes]
    F --> G[Update Documentation]
    G --> H[Create Pull Request]
    H --> I[Review & Merge]
```

**Best Practices:**

- Follow TypeScript best practices
- Use Zod for data validation
- Maintain responsive design
- Add proper accessibility attributes
- Update documentation

## 🤝 Contributing

We welcome contributions! Here's how you can help improve Easy Resume:

### Development Process

**1. Fork & Clone:**

```bash
git clone https://github.com/ChanMeng666/easy-resume.git
cd easy-resume
```

**2. Create Branch:**

```bash
git checkout -b feature/your-feature-name
```

**3. Make Changes:**

- Follow TypeScript best practices
- Maintain responsive design principles
- Add proper documentation
- Test on multiple devices

**4. Submit PR:**

- Provide clear description
- Include screenshots for UI changes
- Reference related issues
- Ensure all checks pass

### Contribution Guidelines

**Code Style:**
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Maintain consistent indentation

**Pull Request Process:**
1. Update README.md if needed
2. Test on multiple devices/browsers
3. Ensure accessibility standards
4. Request review from maintainers

[![][pr-welcome-shield]][pr-welcome-link]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Open Source Benefits:**
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed

## 👥 Contact

**Chan Meng**
- <img src="https://cdn.simpleicons.org/linkedin/0A66C2" width="16" height="16"> LinkedIn: [chanmeng666](https://www.linkedin.com/in/chanmeng666/)
- <img src="https://cdn.simpleicons.org/github/181717" width="16" height="16"> GitHub: [ChanMeng666](https://github.com/ChanMeng666)
- <img src="https://cdn.simpleicons.org/gmail/EA4335" width="16" height="16"> Email: [chanmeng.dev@gmail.com](mailto:chanmeng.dev@gmail.com)
- <img src="https://cdn.simpleicons.org/internetexplorer/0078D4" width="16" height="16"> Website: [chanmeng.live](https://2d-portfolio-eta.vercel.app/)

---

<div align="center">
<strong>🚀 Generate Professional LaTeX Resumes with Modern Technology 🌟</strong>
<br/>
<em>Empowering professionals with beautiful LaTeX resume generation</em>
<br/><br/>

⭐ **Star us on GitHub** • 📖 **Read the Documentation** • 🐛 **Report Issues** • 💡 **Request Features** • 🤝 **Contribute**

<br/><br/>

**Made with ❤️ by Chan Meng**

<img src="https://img.shields.io/github/stars/ChanMeng666/easy-resume?style=social" alt="GitHub stars">
<img src="https://img.shields.io/github/forks/ChanMeng666/easy-resume?style=social" alt="GitHub forks">

</div>

---

<!-- LINK DEFINITIONS -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square

<!-- Project Links -->
[demo-link]: https://easy-resume-theta.vercel.app/
[docs-link]: https://github.com/ChanMeng666/easy-resume#readme

<!-- GitHub Links -->
[github-issues-link]: https://github.com/ChanMeng666/easy-resume/issues
[github-stars-link]: https://github.com/ChanMeng666/easy-resume/stargazers
[github-forks-link]: https://github.com/ChanMeng666/easy-resume/forks
[github-release-link]: https://github.com/ChanMeng666/easy-resume/releases
[pr-welcome-link]: https://github.com/ChanMeng666/easy-resume/pulls
[github-license-link]: https://github.com/ChanMeng666/easy-resume/blob/master/LICENSE

<!-- Shield Badges -->
[github-release-shield]: https://img.shields.io/github/v/release/ChanMeng666/easy-resume?color=369eff&labelColor=black&logo=github&style=flat-square
[vercel-shield]: https://img.shields.io/badge/vercel-online-55b467?labelColor=black&logo=vercel&style=flat-square
[github-stars-shield]: https://img.shields.io/github/stars/ChanMeng666/easy-resume?color=ffcb47&labelColor=black&style=flat-square
[github-forks-shield]: https://img.shields.io/github/forks/ChanMeng666/easy-resume?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-shield]: https://img.shields.io/github/issues/ChanMeng666/easy-resume?color=ff80eb&labelColor=black&style=flat-square
[github-license-shield]: https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square
[pr-welcome-shield]: https://img.shields.io/badge/🤝_PRs_welcome-%E2%86%92-ffcb47?labelColor=black&style=for-the-badge

<!-- Badge Variants -->
[demo-shield-badge]: https://img.shields.io/badge/LIVE%20DEMO-ONLINE-55b467?labelColor=black&logo=vercel&style=for-the-badge
[vercel-link]: https://easy-resume-theta.vercel.app/

<!-- Social Share Links -->
[share-x-link]: https://x.com/intent/tweet?hashtags=resume,latex,nextjs,typescript&text=Check%20out%20this%20amazing%20LaTeX%20resume%20generator&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Feasy-resume
[share-linkedin-link]: https://linkedin.com/sharing/share-offsite/?url=https://github.com/ChanMeng666/easy-resume
[share-reddit-link]: https://www.reddit.com/submit?title=Modern%20LaTeX%20Resume%20Generator%20with%20Next.js&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Feasy-resume

[share-x-shield]: https://img.shields.io/badge/-share%20on%20x-black?labelColor=black&logo=x&logoColor=white&style=flat-square
[share-linkedin-shield]: https://img.shields.io/badge/-share%20on%20linkedin-black?labelColor=black&logo=linkedin&logoColor=white&style=flat-square
[share-reddit-shield]: https://img.shields.io/badge/-share%20on%20reddit-black?labelColor=black&logo=reddit&logoColor=white&style=flat-square

<!-- Deployment Links -->
[deploy-netlify-link]: https://app.netlify.com/start/deploy?repository=https://github.com/ChanMeng666/easy-resume
[deploy-railway-link]: https://railway.app/new/template?template=https://github.com/ChanMeng666/easy-resume

[deploy-netlify-button]: https://www.netlify.com/img/deploy/button.svg
[deploy-railway-button]: https://railway.app/button.svg

<!-- Images -->
[image-star]: https://via.placeholder.com/800x200/FFD700/000000?text=Star+Us+on+GitHub
