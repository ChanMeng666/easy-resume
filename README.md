<div align="center"><a name="readme-top"></a>

[![Project Banner](./public/vitex.svg)](#)

# Vitex<br/><h3>AI-Powered Resume Generation Platform</h3>

Paste a job description, describe your background, and get a tailored, ATS-optimized resume PDF + cover letter in ~30 seconds.<br/>
Built with Next.js 15, React 19, TypeScript, and Vercel AI SDK.

[Live Demo][demo-link] · [Report Bug][github-issues-link] · [Request Feature][github-issues-link]

<br/>

<!-- SHIELD GROUP -->

[![][github-release-shield]][github-release-link]
[![][deployment-shield]][deployment-link]
[![][github-stars-shield]][github-stars-link]
[![][github-forks-shield]][github-forks-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]

**Share Vitex**

[![][share-x-shield]][share-x-link]
[![][share-linkedin-shield]][share-linkedin-link]
[![][share-reddit-shield]][share-reddit-link]

</div>

## Introduction

Vitex is an AI-powered resume generation platform that transforms a job description and your professional background into a polished, ATS-optimized resume PDF and cover letter. A 7-step AI pipeline handles everything from JD parsing and skill matching to document generation, with Typst compiling PDFs locally in under 100ms. The UI follows a bold Neobrutalism design system with hard shadows, thick borders, and high contrast.

## Key Features

- **AI Resume Generation** -- Paste a job description + describe your background, get a tailored resume PDF
- **7-Step AI Pipeline** -- JD parsing, background parsing, match analysis, tailoring, ATS scoring, cover letter, document generation
- **14 Professional Templates** -- Auto-selected by AI based on industry and role
- **ATS Optimization** -- Real-time ATS compatibility scoring with actionable feedback
- **Cover Letter Generation** -- Automatically generated alongside the resume
- **Typst-Powered PDF** -- Local compilation in <100ms, no external APIs required
- **Natural Language Refinement** -- Describe changes in plain English, AI regenerates the resume
- **Credit System** -- Stripe-powered subscription plans for usage management
- **Resume Sharing** -- Public share links with unique tokens
- **Cloud Storage** -- Persistent resume management with user accounts

## How It Works

1. **Input** -- Paste a job description and describe your professional background on the homepage
2. **Generate** -- AI analyzes, matches, tailors, and compiles your resume through a 7-step pipeline streamed via SSE
3. **Refine & Export** -- Review the PDF preview, ATS score, and cover letter; refine with natural language; download or share

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, React 19, TypeScript |
| AI | Vercel AI SDK v6 + OpenAI GPT-4o |
| Resume Rendering | Typst (local binary, <100ms compilation) |
| Design System | Neobrutalism (Tailwind CSS + shadcn/ui) |
| Database | Neon PostgreSQL + Drizzle ORM |
| Cache | Upstash Redis |
| Auth | Stack Auth |
| Payments | Stripe |
| Storage | Cloudinary |
| Deployment | DigitalOcean VPS, Docker, Traefik, GitHub Actions CI/CD |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for production deployment)
- Typst binary (for local PDF compilation)

### Installation

```bash
git clone https://github.com/ChanMeng666/easy-resume.git
cd easy-resume
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# AI
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Auth
STACK_PROJECT_ID=...
STACK_API_KEY=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Cache
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Development

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Deployment

Vitex runs as a Docker container on a VPS behind Traefik reverse proxy, with GitHub Actions for CI/CD.

```bash
# Build Docker image
docker build -t vitex .

# Run container
docker run -p 3000:3000 --env-file .env vitex
```

The production deployment uses:
- **DigitalOcean VPS** as the host
- **Docker** for containerization
- **Traefik** for reverse proxy and TLS
- **GitHub Actions** for automated build and deploy on push

## Architecture

```
Monolith Next.js App (Docker Container on VPS)
|
|-- Pages
|   |-- /                    Landing page: JD + background input
|   |-- /editor              Result review: PDF preview, ATS score, cover letter, refinement
|   |-- /dashboard           Resume management + credits
|   |-- /pricing             Subscription plans
|   |-- /share/[token]       Public resume sharing
|
|-- AI Pipeline (SSE streaming)
|   |-- 1. JD Parsing
|   |-- 2. Background Parsing
|   |-- 3. Match Analysis
|   |-- 4. Resume Tailoring
|   |-- 5. ATS Scoring
|   |-- 6. Cover Letter
|   |-- 7. Document Generation (Typst)
|
|-- Services
|   |-- Neon PostgreSQL (Drizzle ORM)
|   |-- Upstash Redis (caching)
|   |-- Stack Auth (authentication)
|   |-- Stripe (payments)
|   |-- Cloudinary (file storage)
|   |-- OpenAI GPT-4o (AI generation)
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

**Chan Meng**
- LinkedIn: [chanmeng666](https://www.linkedin.com/in/chanmeng666/)
- GitHub: [ChanMeng666](https://github.com/ChanMeng666)
- Email: [chanmeng.dev@gmail.com](mailto:chanmeng.dev@gmail.com)
- Website: [chanmeng.org](https://chanmeng.org/)

---

<div align="center">

**Vitex - AI-Powered Resume Generation Platform**

Made with care by Chan Meng

</div>

---

<!-- LINK DEFINITIONS -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square

<!-- Project Links -->
[demo-link]: https://vitex.org.nz
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
[deployment-shield]: https://img.shields.io/badge/deployment-online-55b467?labelColor=black&logo=docker&style=flat-square
[deployment-link]: https://vitex.org.nz
[github-stars-shield]: https://img.shields.io/github/stars/ChanMeng666/easy-resume?color=ffcb47&labelColor=black&style=flat-square
[github-forks-shield]: https://img.shields.io/github/forks/ChanMeng666/easy-resume?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-shield]: https://img.shields.io/github/issues/ChanMeng666/easy-resume?color=ff80eb&labelColor=black&style=flat-square
[github-license-shield]: https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square
[pr-welcome-shield]: https://img.shields.io/badge/PRs_welcome-%E2%86%92-ffcb47?labelColor=black&style=for-the-badge

<!-- Social Share Links -->
[share-x-link]: https://x.com/intent/tweet?hashtags=vitex,resume,ai&text=Check%20out%20Vitex%20-%20AI-Powered%20Resume%20Generation&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Feasy-resume
[share-linkedin-link]: https://linkedin.com/sharing/share-offsite/?url=https://github.com/ChanMeng666/easy-resume
[share-reddit-link]: https://www.reddit.com/submit?title=Vitex%20-%20AI-Powered%20Resume%20Generation%20Platform&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Feasy-resume

[share-x-shield]: https://img.shields.io/badge/-share%20on%20x-black?labelColor=black&logo=x&logoColor=white&style=flat-square
[share-linkedin-shield]: https://img.shields.io/badge/-share%20on%20linkedin-black?labelColor=black&logo=linkedin&logoColor=white&style=flat-square
[share-reddit-shield]: https://img.shields.io/badge/-share%20on%20reddit-black?labelColor=black&logo=reddit&logoColor=white&style=flat-square
