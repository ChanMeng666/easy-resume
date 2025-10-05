/**
 * Reverse Two-Column LaTeX Generator
 * 40/60 layout (reversed from standard two-column)
 */

import { ResumeData } from '@/lib/validation/schema';
import {
  escapeLaTeX,
  formatDateRange,
  arrayToCompactItemize,
  cleanURL,
  escapeURL,
} from '@/lib/latex/utils';

/**
 * Generate complete Reverse Two-Column LaTeX code
 */
export function generateReverseTwoColumn(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    '% Two-column layout: 40/60 reverse',
    '\\columnratio{0.4}',
    '\\setlength{\\columnsep}{1.5em}',
    '\\begin{paracol}{2}',
    '',
    '% LEFT COLUMN (40%) - Sidebar info',
    generateLeftSidebar(data),
    '',
    '% RIGHT COLUMN (60%) - Main content',
    '\\switchcolumn',
    '',
    generateRightMain(data),
    '',
    '\\end{paracol}',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with reverse column styling
 */
function generatePreamble(): string {
  return `\\documentclass[10pt,a4paper]{article}

% Packages
\\usepackage[left=1.25cm, right=1.25cm, top=1.5cm, bottom=1.5cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{paracol}
\\usepackage{tikz}

% Colors - Professional grey and burgundy palette
\\definecolor{PrimaryColor}{HTML}{7f1d1d}
\\definecolor{AccentColor}{HTML}{991b1b}
\\definecolor{SidebarBg}{HTML}{f3f4f6}
\\definecolor{TextPrimary}{HTML}{1f2937}
\\definecolor{TextSecondary}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=PrimaryColor,
    urlcolor=PrimaryColor,
    pdfborder={0 0 0}
}

% Section formatting for main content
\\titleformat{\\section}
  {\\Large\\bfseries\\color{PrimaryColor}}
  {}{0em}{}[\\color{AccentColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Subsection for sidebar
\\titleformat{\\subsection}
  {\\large\\bfseries\\color{PrimaryColor}}
  {}{0em}{\\uppercase}
\\titlespacing*{\\subsection}{0pt}{10pt}{6pt}

% Custom commands
\\newcommand{\\sidebarsection}[1]{%
    \\subsection{#1}
}

\\newcommand{\\skillitem}[1]{%
    \\tikz[baseline=(char.base)]{%
        \\node[shape=rectangle, rounded corners=2pt, fill=AccentColor!20,
              inner sep=2pt, text=PrimaryColor] (char) {\\small #1};%
    }\\hspace{2pt}%
}

\\newcommand{\\mainevent}[4]{%
    \\textbf{\\large\\color{TextPrimary}#1} \\hfill \\textcolor{TextSecondary}{\\textit{#3}}\\\\
    \\textit{\\color{PrimaryColor}#2} \\hfill \\textcolor{TextSecondary}{#4}\\\\[4pt]
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
 * Generate header with personal information
 */
function generateHeader(basics: ResumeData['basics']): string {
  const lines: string[] = [];

  lines.push('\\begin{center}');
  lines.push(`{\\Huge\\bfseries\\color{PrimaryColor}${escapeLaTeX(basics.name)}}`);
  lines.push('\\\\[4pt]');
  lines.push(`{\\Large\\color{TextSecondary}${escapeLaTeX(basics.label)}}`);
  lines.push('\\end{center}');
  lines.push('');
  lines.push('\\vspace{0.5em}');
  lines.push('{\\color{AccentColor}\\hrule height 2pt}');
  lines.push('\\vspace{0.5em}');

  return lines.join('\n');
}

/**
 * Generate left sidebar (40%)
 */
function generateLeftSidebar(data: ResumeData): string {
  const sections = [
    generateContactSection(data.basics),
    generateSkillsSidebar(data.skills),
    generateEducationSidebar(data.education),
    generateAchievementsSidebar(data.achievements),
    generateCertificationsSidebar(data.certifications),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate contact section for sidebar
 */
function generateContactSection(basics: ResumeData['basics']): string {
  const lines: string[] = ['\\sidebarsection{Contact}', ''];

  if (basics.email) {
    lines.push(`\\faEnvelope\\ \\href{mailto:${basics.email}}{\\small ${basics.email}}`);
    lines.push('\\\\[3pt]');
  }

  if (basics.phone) {
    lines.push(`\\faPhone\\ {\\small ${escapeLaTeX(basics.phone)}}`);
    lines.push('\\\\[3pt]');
  }

  if (basics.location) {
    lines.push(`\\faMapMarker\\ {\\small ${escapeLaTeX(basics.location)}}`);
    lines.push('\\\\[3pt]');
  }

  basics.profiles.forEach((profile) => {
    const cleanUrl = cleanURL(profile.url);
    const icon = profile.network.toLowerCase() === 'linkedin' ? '\\faLinkedin' :
                 profile.network.toLowerCase() === 'github' ? '\\faGithub' : '\\faGlobe';
    lines.push(`${icon}\\ \\href{${escapeURL(profile.url)}}{\\small ${escapeLaTeX(cleanUrl)}}`);
    lines.push('\\\\[3pt]');
  });

  return lines.join('\n');
}

/**
 * Generate skills section for sidebar
 */
function generateSkillsSidebar(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const lines: string[] = ['\\sidebarsection{Skills}', ''];

  skills.forEach((skillGroup) => {
    lines.push(`\\textbf{\\color{PrimaryColor}${escapeLaTeX(skillGroup.name)}}`);
    lines.push('\\\\[4pt]');

    const tags = skillGroup.keywords.map(k => `\\skillitem{${escapeLaTeX(k)}}`).join('');
    lines.push(tags);
    lines.push('\\\\[8pt]');
  });

  return lines.join('\n');
}

/**
 * Generate education section for sidebar
 */
function generateEducationSidebar(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const lines: string[] = ['\\sidebarsection{Education}', ''];

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
 * Generate achievements section for sidebar
 */
function generateAchievementsSidebar(achievements: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const lines: string[] = ['\\sidebarsection{Achievements}', ''];

  achievements.forEach((achievement) => {
    lines.push(`\\textcolor{TextPrimary}{\\textbullet}\\ {\\small ${escapeLaTeX(achievement)}}`);
    lines.push('\\\\[3pt]');
  });

  return lines.join('\n');
}

/**
 * Generate certifications section for sidebar
 */
function generateCertificationsSidebar(certifications: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const lines: string[] = ['\\sidebarsection{Certifications}', ''];

  certifications.forEach((cert) => {
    lines.push(`\\textcolor{TextPrimary}{\\textbullet}\\ {\\small ${escapeLaTeX(cert)}}`);
    lines.push('\\\\[3pt]');
  });

  return lines.join('\n');
}

/**
 * Generate right main content (60%)
 */
function generateRightMain(data: ResumeData): string {
  const sections = [
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
