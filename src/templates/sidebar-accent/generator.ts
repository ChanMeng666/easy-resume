/**
 * Sidebar Accent LaTeX Generator
 * 25/75 two-column layout with colored sidebar
 */

import { ResumeData } from '@/lib/validation/schema';
import {
  escapeLaTeX,
  formatDateRange,
  arrayToCompactItemize,
  cleanURL,
} from '@/lib/latex/utils';

/**
 * Generate complete Sidebar Accent LaTeX code
 */
export function generateSidebarAccent(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    '% Two-column layout with sidebar',
    '\\columnratio{0.25}',
    '\\setlength{\\columnsep}{0pt}',
    '\\begin{paracol}{2}',
    '',
    '% LEFT SIDEBAR - Colored background',
    '\\begin{leftcolumn*}',
    generateSidebarBackground(),
    generateSidebarHeader(data.basics),
    generateSidebarContact(data.basics),
    generateSidebarSkills(data.skills),
    generateSidebarEducation(data.education),
    '\\end{leftcolumn*}',
    '',
    '% RIGHT COLUMN - Main content',
    '\\switchcolumn',
    '',
    generateMainContent(data),
    '',
    '\\end{paracol}',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with sidebar styling
 */
function generatePreamble(): string {
  return `\\documentclass[10pt,a4paper]{article}

% Packages
\\usepackage[left=0cm, right=1.5cm, top=1cm, bottom=1cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{paracol}
\\usepackage{tikz}
\\usepackage{graphicx}

% Colors - Teal and blue palette
\\definecolor{SidebarBg}{HTML}{0d9488}
\\definecolor{SidebarText}{HTML}{ffffff}
\\definecolor{MainAccent}{HTML}{0891b2}
\\definecolor{TextPrimary}{HTML}{1f2937}
\\definecolor{TextSecondary}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=MainAccent,
    urlcolor=MainAccent,
    pdfborder={0 0 0}
}

% Section formatting for main content
\\titleformat{\\section}
  {\\Large\\bfseries\\color{MainAccent}}
  {}{0em}{}[\\color{MainAccent}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Subsection formatting for sidebar
\\titleformat{\\subsection}
  {\\large\\bfseries\\color{SidebarText}}
  {}{0em}{\\uppercase}
\\titlespacing*{\\subsection}{0pt}{10pt}{6pt}

% Custom commands
\\newcommand{\\sidebarheader}[2]{%
    \\begin{center}
    {\\LARGE\\bfseries\\color{SidebarText}#1}\\\\[4pt]
    {\\large\\color{SidebarText!90}#2}
    \\end{center}
}

\\newcommand{\\sidebarcontact}[2]{%
    \\textcolor{SidebarText}{#1}\\ \\textcolor{SidebarText!90}{\\small #2}\\\\[3pt]
}

\\newcommand{\\sidebarskill}[1]{%
    \\textcolor{SidebarText}{\\textbullet\\ #1}\\\\[2pt]
}

\\newcommand{\\sidebaredu}[3]{%
    \\textcolor{SidebarText}{\\textbf{#1}}\\\\
    {\\small\\textcolor{SidebarText!90}{#2}}\\\\
    {\\small\\textcolor{SidebarText!80}{#3}}\\\\[6pt]
}

\\newcommand{\\mainevent}[4]{%
    \\textbf{\\large\\color{TextPrimary}#1} \\hfill \\textcolor{TextSecondary}{\\textit{#3}}\\\\
    \\textit{\\color{MainAccent}#2} \\hfill \\textcolor{TextSecondary}{#4}\\\\[4pt]
}

\\newcommand{\\cvdivider}{\\vspace{6pt}}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=2pt, parsep=0pt}

% Paragraph settings
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

% Background color for left column
\\backgroundcolor{c[0]}{SidebarBg}`;
}

/**
 * Generate sidebar background setup
 */
function generateSidebarBackground(): string {
  return `% Sidebar content with padding
\\hspace{0.5cm}
\\begin{minipage}[t]{0.85\\linewidth}
\\vspace{1cm}`;
}

/**
 * Generate sidebar header with name and title
 */
function generateSidebarHeader(basics: ResumeData['basics']): string {
  return `\\sidebarheader{${escapeLaTeX(basics.name)}}{${escapeLaTeX(basics.label)}}

\\vspace{1cm}`;
}

/**
 * Generate sidebar contact information
 */
function generateSidebarContact(basics: ResumeData['basics']): string {
  const contactLines: string[] = ['\\subsection{Contact}', ''];

  if (basics.email) {
    contactLines.push(`\\sidebarcontact{\\faEnvelope}{${escapeLaTeX(basics.email)}}`);
  }

  if (basics.phone) {
    contactLines.push(`\\sidebarcontact{\\faPhone}{${escapeLaTeX(basics.phone)}}`);
  }

  if (basics.location) {
    contactLines.push(`\\sidebarcontact{\\faMapMarker}{${escapeLaTeX(basics.location)}}`);
  }

  basics.profiles.forEach((profile) => {
    const cleanUrl = cleanURL(profile.url);
    const icon = profile.network.toLowerCase() === 'linkedin' ? '\\faLinkedin' :
                 profile.network.toLowerCase() === 'github' ? '\\faGithub' : '\\faGlobe';
    contactLines.push(`\\sidebarcontact{${icon}}{${escapeLaTeX(cleanUrl)}}`);
  });

  contactLines.push('\\vspace{0.5cm}');

  return contactLines.join('\n');
}

/**
 * Generate sidebar skills section
 */
function generateSidebarSkills(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const lines: string[] = ['\\subsection{Skills}', ''];

  skills.forEach((skillGroup) => {
    lines.push(`\\textcolor{SidebarText}{\\textbf{${escapeLaTeX(skillGroup.name)}}}\\\\[3pt]`);
    skillGroup.keywords.forEach((keyword) => {
      lines.push(`\\sidebarskill{${escapeLaTeX(keyword)}}`);
    });
    lines.push('\\vspace{4pt}');
  });

  lines.push('\\vspace{0.5cm}');

  return lines.join('\n');
}

/**
 * Generate sidebar education section
 */
function generateSidebarEducation(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const lines: string[] = ['\\subsection{Education}', ''];

  education.forEach((edu) => {
    const degree = `${edu.studyType} of ${edu.area}`;
    const dateRange = formatDateRange(edu.startDate, edu.endDate);
    lines.push(`\\sidebaredu{${escapeLaTeX(degree)}}{${escapeLaTeX(edu.institution)}}{${dateRange}}`);
  });

  lines.push('\\vspace{1cm}');
  lines.push('\\end{minipage}');

  return lines.join('\n');
}

/**
 * Generate main content area
 */
function generateMainContent(data: ResumeData): string {
  const sections = [
    '\\vspace{1cm}',
    generateSummary(data.basics.summary),
    generateExperience(data.work),
    generateProjects(data.projects),
    generateAchievements(data.achievements),
    generateCertifications(data.certifications),
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
    const title = `\\textbf{\\color{TextPrimary}${escapeLaTeX(project.name)}}`;
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
 * Generate achievements section
 */
function generateAchievements(achievements: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements.map(achievement => `  \\item ${escapeLaTeX(achievement)}`).join('\n');

  return `\\section{Achievements}

\\begin{itemize}
${items}
\\end{itemize}`;
}

/**
 * Generate certifications section
 */
function generateCertifications(certifications: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const items = certifications.map(cert => `  \\item ${escapeLaTeX(cert)}`).join('\n');

  return `\\section{Certifications}

\\begin{itemize}
${items}
\\end{itemize}`;
}
