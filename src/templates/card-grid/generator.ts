/**
 * Card Grid Layout LaTeX Generator
 * 50/50 layout with card-based design
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
 * Generate complete Card Grid Layout LaTeX code
 */
export function generateCardGrid(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateSummary(data.basics.summary),
    '',
    '% Two-column card grid',
    '\\columnratio{0.5}',
    '\\setlength{\\columnsep}{1em}',
    '\\begin{paracol}{2}',
    '',
    '% LEFT COLUMN - Cards',
    generateLeftCards(data),
    '',
    '% RIGHT COLUMN - Cards',
    '\\switchcolumn',
    '',
    generateRightCards(data),
    '',
    '\\end{paracol}',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with card styling
 */
function generatePreamble(): string {
  return `\\documentclass[10pt,a4paper]{article}

% Packages
\\usepackage[left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{paracol}
\\usepackage{tcolorbox}
\\tcbuselibrary{skins}

% Colors - Modern vibrant palette
\\definecolor{CardAccent}{HTML}{8b5cf6}
\\definecolor{CardBorder}{HTML}{a78bfa}
\\definecolor{CardBg}{HTML}{faf5ff}
\\definecolor{HeaderColor}{HTML}{6d28d9}
\\definecolor{TextPrimary}{HTML}{1f2937}
\\definecolor{TextSecondary}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=CardAccent,
    urlcolor=CardAccent,
    pdfborder={0 0 0}
}

% Section formatting
\\titleformat{\\section}
  {\\LARGE\\bfseries\\color{HeaderColor}}
  {}{0em}{}
\\titlespacing*{\\section}{0pt}{0pt}{10pt}

% Custom card environment
\\newtcolorbox{card}[1][]{
    enhanced,
    colback=CardBg,
    colframe=CardAccent,
    boxrule=0pt,
    leftrule=3pt,
    arc=4pt,
    boxsep=5pt,
    left=8pt,
    right=8pt,
    top=8pt,
    bottom=8pt,
    #1
}

% Custom commands
\\newcommand{\\cardheader}[1]{%
    \\textbf{\\large\\color{CardAccent}#1}\\\\[4pt]
}

\\newcommand{\\cardevent}[4]{%
    \\textbf{\\color{TextPrimary}#1}\\\\
    \\textit{\\color{CardAccent}#2}\\\\
    {\\small\\color{TextSecondary}#3 $\\bullet$ #4}\\\\[4pt]
}

\\newcommand{\\cardproject}[2]{%
    \\textbf{\\color{TextPrimary}#1}\\\\
    {\\small\\color{TextSecondary}#2}\\\\[4pt]
}

\\newcommand{\\cardskill}[1]{%
    \\colorbox{CardAccent!20}{\\color{CardAccent}\\small\\textbf{#1}}\\hspace{2pt}%
}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=2pt, parsep=0pt}

% Paragraph settings
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}`;
}

/**
 * Generate header
 */
function generateHeader(basics: ResumeData['basics']): string {
  const lines: string[] = [];

  lines.push('\\begin{center}');
  lines.push(`{\\Huge\\bfseries\\color{HeaderColor}${escapeLaTeX(basics.name)}}`);
  lines.push('\\\\[4pt]');
  lines.push(`{\\Large\\color{CardAccent}${escapeLaTeX(basics.label)}}`);
  lines.push('\\\\[8pt]');

  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(`\\faEnvelope\\ \\href{mailto:${basics.email}}{${basics.email}}`);
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
    contactParts.push(`${icon}\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(cleanUrl)}}`);
  });

  lines.push(`{\\small\\color{TextSecondary}${contactParts.join(' $\\cdot$ ')}}`);
  lines.push('\\end{center}');

  return lines.join('\n');
}

/**
 * Generate summary section (full width)
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section{Professional Summary}

${escapeLaTeX(summary)}

\\vspace{0.5em}`;
}

/**
 * Generate left column cards
 */
function generateLeftCards(data: ResumeData): string {
  const sections = [
    generateExperienceCards(data.work),
    generateEducationCard(data.education),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate experience cards
 */
function generateExperienceCards(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const cards = work.map((job) => {
    const dateRange = formatDateRange(job.startDate, job.endDate);

    let content = `\\cardevent{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)}}{${dateRange}}{${escapeLaTeX(job.location)}}`;

    if (job.highlights && job.highlights.length > 0) {
      const [description, ...bulletPoints] = job.highlights;
      content += '\n' + escapeLaTeX(description);
      if (bulletPoints.length > 0) {
        content += '\n' + arrayToCompactItemize(bulletPoints);
      }
    }

    return `\\begin{card}
\\cardheader{Work Experience}
${content}
\\end{card}`;
  });

  return cards.join('\n\n\\vspace{0.5em}\n\n');
}

/**
 * Generate education card
 */
function generateEducationCard(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const entries = education.map((edu) => {
    const degree = `${edu.studyType} of ${edu.area}`;
    const dateRange = formatDateRange(edu.startDate, edu.endDate);

    let content = `\\textbf{\\color{TextPrimary}${escapeLaTeX(degree)}}\\\\
\\textit{\\color{CardAccent}${escapeLaTeX(edu.institution)}}\\\\
{\\small\\color{TextSecondary}${dateRange} $\\bullet$ ${escapeLaTeX(edu.location)}}`;

    if (edu.note) {
      content += `\\\\[4pt]\n{\\small ${escapeLaTeX(edu.note)}}`;
    }

    return content;
  });

  return `\\begin{card}
\\cardheader{Education}
${entries.join('\\\\[8pt]\n')}
\\end{card}`;
}

/**
 * Generate right column cards
 */
function generateRightCards(data: ResumeData): string {
  const sections = [
    generateSkillsCard(data.skills),
    generateProjectsCards(data.projects),
    generateAchievementsCard(data.achievements),
    generateCertificationsCard(data.certifications),
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate skills card
 */
function generateSkillsCard(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const entries = skills.map((skillGroup) => {
    const tags = skillGroup.keywords.map(k => `\\cardskill{${escapeLaTeX(k)}}`).join('');
    return `\\textbf{\\color{CardAccent}${escapeLaTeX(skillGroup.name)}}\\\\[4pt]\n${tags}`;
  });

  return `\\begin{card}
\\cardheader{Skills}
${entries.join('\\\\[8pt]\n')}
\\end{card}`;
}

/**
 * Generate projects cards
 */
function generateProjectsCards(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const cards = projects.slice(0, 3).map((project) => {
    let content = `\\cardproject{${escapeLaTeX(project.name)}}{${escapeLaTeX(project.description)}}`;

    if (project.highlights && project.highlights.length > 0) {
      content += '\n' + arrayToCompactItemize(project.highlights);
    }

    return `\\begin{card}
\\cardheader{Project}
${content}
\\end{card}`;
  });

  return cards.join('\n\n\\vspace{0.5em}\n\n');
}

/**
 * Generate achievements card
 */
function generateAchievementsCard(achievements: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements.map(achievement => `  \\item ${escapeLaTeX(achievement)}`).join('\n');

  return `\\begin{card}
\\cardheader{Achievements}
\\begin{itemize}
${items}
\\end{itemize}
\\end{card}`;
}

/**
 * Generate certifications card
 */
function generateCertificationsCard(certifications: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const items = certifications.slice(0, 6).map(cert => `  \\item ${escapeLaTeX(cert)}`).join('\n');

  return `\\vspace{0.5em}

\\begin{card}
\\cardheader{Certifications}
\\begin{itemize}
${items}
\\end{itemize}
\\end{card}`;
}
