/**
 * Three-Section Column LaTeX Generator
 * Hybrid layout: full-width header + 30/70 columns + full-width footer
 */

import { ResumeData } from '@/lib/validation/schema';
import {
  escapeLaTeX,
  formatDateRange,
  arrayToCompactItemize,
  cleanURL,
} from '@/lib/latex/utils';

/**
 * Generate complete Three-Section Column LaTeX code
 */
export function generateThreeSection(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    '% SECTION 1: Full-width header',
    generateBannerHeader(data.basics),
    '',
    '% SECTION 2: Two-column body (30/70)',
    '\\columnratio{0.3}',
    '\\setlength{\\columnsep}{1.2em}',
    '\\begin{paracol}{2}',
    '',
    '% Left sidebar (30%)',
    generateLeftSidebar(data),
    '',
    '% Right main content (70%)',
    '\\switchcolumn',
    '',
    generateRightMain(data),
    '',
    '\\end{paracol}',
    '',
    '% SECTION 3: Full-width footer',
    generateFooter(data),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with three-section styling
 */
function generatePreamble(): string {
  return `\\documentclass[10pt,a4paper]{article}

% Packages
\\usepackage[left=1.25cm, right=1.25cm, top=0.5cm, bottom=1.5cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{paracol}
\\usepackage{tikz}
\\usetikzlibrary{shadings}

% Colors - Gradient blue palette
\\definecolor{BannerStart}{HTML}{1e40af}
\\definecolor{BannerEnd}{HTML}{3b82f6}
\\definecolor{AccentColor}{HTML}{60a5fa}
\\definecolor{SidebarBg}{HTML}{eff6ff}
\\definecolor{TextPrimary}{HTML}{1f2937}
\\definecolor{TextSecondary}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=AccentColor,
    urlcolor=AccentColor,
    pdfborder={0 0 0}
}

% Section formatting
\\titleformat{\\section}
  {\\Large\\bfseries\\color{BannerStart}}
  {}{0em}{}[\\color{AccentColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{6pt}

% Subsection for sidebar
\\titleformat{\\subsection}
  {\\large\\bfseries\\color{BannerStart}}
  {}{0em}{\\uppercase}
\\titlespacing*{\\subsection}{0pt}{8pt}{4pt}

% Custom commands
\\newcommand{\\bannersection}{%
    \\begin{tikzpicture}[remember picture, overlay]
    \\fill[left color=BannerStart, right color=BannerEnd]
        (current page.north west) rectangle ([yshift=-3.5cm]current page.north east);
    \\end{tikzpicture}%
}

\\newcommand{\\bannertext}[2]{%
    \\vspace{0.8cm}
    \\begin{center}
    {\\Huge\\bfseries\\color{white}#1}\\\\[6pt]
    {\\Large\\color{white!90}#2}
    \\end{center}
    \\vspace{0.8cm}
}

\\newcommand{\\bannercontact}[1]{%
    \\begin{center}
    {\\small\\color{white!95}#1}
    \\end{center}
    \\vspace{0.5cm}
}

\\newcommand{\\sidebaritem}[2]{%
    #1\\ {\\small\\color{TextSecondary}#2}\\\\[3pt]
}

\\newcommand{\\skillbadge}[1]{%
    \\colorbox{AccentColor!20}{\\color{BannerStart}\\small\\textbf{#1}}\\hspace{2pt}%
}

\\newcommand{\\mainevent}[4]{%
    \\textbf{\\large\\color{TextPrimary}#1} \\hfill \\textcolor{TextSecondary}{\\textit{#3}}\\\\
    \\textit{\\color{AccentColor}#2} \\hfill \\textcolor{TextSecondary}{#4}\\\\[4pt]
}

\\newcommand{\\cvdivider}{%
    \\vspace{6pt}
    {\\color{AccentColor!30}\\hrule}
    \\vspace{6pt}
}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=2pt, parsep=0pt}

% Paragraph settings
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

% Column backgrounds
\\backgroundcolor{c[0]}{SidebarBg}
\\backgroundcolor{c[1]}{white}`;
}

/**
 * Generate banner header (Section 1)
 */
function generateBannerHeader(basics: ResumeData['basics']): string {
  const lines: string[] = [];

  lines.push('\\bannersection');
  lines.push('');
  lines.push(`\\bannertext{${escapeLaTeX(basics.name)}}{${escapeLaTeX(basics.label)}}`);

  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(`\\faEnvelope\\ ${basics.email}`);
  }

  if (basics.phone) {
    contactParts.push(`\\faPhone\\ ${escapeLaTeX(basics.phone)}`);
  }

  if (basics.location) {
    contactParts.push(`\\faMapMarker\\ ${escapeLaTeX(basics.location)}`);
  }

  basics.profiles.forEach((profile) => {
    const cleanUrl = cleanURL(profile.url);
    const icon = profile.network.toLowerCase() === 'linkedin' ? '\\faLinkedin' :
                 profile.network.toLowerCase() === 'github' ? '\\faGithub' : '\\faGlobe';
    contactParts.push(`${icon}\\ ${escapeLaTeX(cleanUrl)}`);
  });

  lines.push(`\\bannercontact{${contactParts.join(' $\\bullet$ ')}}`);

  return lines.join('\n');
}

/**
 * Generate left sidebar (30%)
 */
function generateLeftSidebar(data: ResumeData): string {
  const sections = [
    '\\vspace{0.5cm}',
    generateSidebarSkills(data.skills),
    generateSidebarEducation(data.education),
    generateSidebarCertifications(data.certifications),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate sidebar skills
 */
function generateSidebarSkills(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const lines: string[] = ['\\subsection{Skills}', ''];

  skills.forEach((skillGroup) => {
    lines.push(`\\textbf{\\color{BannerStart}${escapeLaTeX(skillGroup.name)}}`);
    lines.push('\\\\[4pt]');

    const badges = skillGroup.keywords.map(k => `\\skillbadge{${escapeLaTeX(k)}}`).join('');
    lines.push(badges);
    lines.push('\\\\[8pt]');
  });

  return lines.join('\n');
}

/**
 * Generate sidebar education
 */
function generateSidebarEducation(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const lines: string[] = ['\\subsection{Education}', ''];

  education.forEach((edu) => {
    const degree = `${edu.studyType} of ${edu.area}`;
    const dateRange = formatDateRange(edu.startDate, edu.endDate);

    lines.push(`\\textbf{\\color{TextPrimary}${escapeLaTeX(degree)}}`);
    lines.push('\\\\[2pt]');
    lines.push(`{\\small\\textit{${escapeLaTeX(edu.institution)}}}`);
    lines.push('\\\\[2pt]');
    lines.push(`{\\small\\color{TextSecondary}${dateRange}}`);

    if (edu.note) {
      lines.push('\\\\[2pt]');
      lines.push(`{\\small ${escapeLaTeX(edu.note)}}`);
    }

    lines.push('\\\\[8pt]');
  });

  return lines.join('\n');
}

/**
 * Generate sidebar certifications (top 5)
 */
function generateSidebarCertifications(certifications: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const lines: string[] = ['\\subsection{Certifications}', ''];

  certifications.slice(0, 5).forEach((cert) => {
    lines.push(`\\textcolor{TextPrimary}{\\textbullet}\\ {\\small ${escapeLaTeX(cert)}}`);
    lines.push('\\\\[3pt]');
  });

  return lines.join('\n');
}

/**
 * Generate right main content (70%)
 */
function generateRightMain(data: ResumeData): string {
  const sections = [
    '\\vspace{0.5cm}',
    generateSummary(data.basics.summary),
    generateExperience(data.work),
    generateProjects(data.projects),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate summary section
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section{Professional Summary}

${escapeLaTeX(summary)}`;
}

/**
 * Generate experience section
 */
function generateExperience(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const entries = work.map((job, index) => {
    const dateRange = formatDateRange(job.startDate, job.endDate);

    let content = '';
    if (job.highlights && job.highlights.length > 0) {
      const [description, ...bulletPoints] = job.highlights;
      content = '\n' + escapeLaTeX(description);
      if (bulletPoints.length > 0) {
        content += '\n' + arrayToCompactItemize(bulletPoints);
      }
    }

    const divider = index < work.length - 1 ? '\n\\cvdivider' : '';

    return `\\mainevent{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)}}{${dateRange}}{${escapeLaTeX(job.location)}}${content}${divider}`;
  });

  return `\\section{Work Experience}

${entries.join('\n\n')}`;
}

/**
 * Generate projects section
 */
function generateProjects(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const entries = projects.map((project, index) => {
    const title = `\\textbf{\\large\\color{TextPrimary}${escapeLaTeX(project.name)}}`;
    const description = ` — ${escapeLaTeX(project.description)}`;

    const highlights = project.highlights && project.highlights.length > 0
      ? '\n' + arrayToCompactItemize(project.highlights)
      : '';

    const divider = index < projects.length - 1 ? '\n\\cvdivider' : '';

    return `${title}${description}${highlights}${divider}`;
  });

  return `\\section{Projects}

${entries.join('\n\n')}`;
}

/**
 * Generate footer (Section 3) - Achievements timeline
 */
function generateFooter(data: ResumeData): string {
  if (!data.achievements || data.achievements.length === 0) return '';

  const items = data.achievements.map(achievement => `  \\item ${escapeLaTeX(achievement)}`).join('\n');

  return `\\vspace{0.5em}
{\\color{AccentColor}\\hrule height 1pt}
\\vspace{0.5em}

\\section{Achievements \\& Recognition}

\\begin{itemize}
${items}
\\end{itemize}`;
}
