/**
 * Timeline Dual-Column LaTeX Generator
 * 50/50 symmetric layout with central timeline
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
 * Generate complete Timeline Dual-Column LaTeX code
 */
export function generateTimelineDual(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateSummary(data.basics.summary),
    '',
    '% Two-column layout with timeline',
    '\\columnratio{0.5}',
    '\\setlength{\\columnsep}{0pt}',
    '\\begin{paracol}{2}',
    '',
    '% LEFT COLUMN - Work Experience',
    generateExperienceColumn(data.work),
    '',
    '% RIGHT COLUMN - Projects',
    '\\switchcolumn',
    '',
    generateProjectsColumn(data.projects),
    '',
    '\\end{paracol}',
    '',
    '% Full-width sections',
    generateSkillsRow(data.skills),
    generateEducationRow(data.education),
    generateAchievementsRow(data.achievements),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with timeline styling
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
\\usepackage{tikz}
\\usetikzlibrary{calc}

% Colors - Orange and blue timeline palette
\\definecolor{TimelineColor}{HTML}{f97316}
\\definecolor{WorkColor}{HTML}{3b82f6}
\\definecolor{ProjectColor}{HTML}{8b5cf6}
\\definecolor{TextPrimary}{HTML}{1f2937}
\\definecolor{TextSecondary}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=TimelineColor,
    urlcolor=TimelineColor,
    pdfborder={0 0 0}
}

% Section formatting
\\titleformat{\\section}
  {\\Large\\bfseries\\color{TextPrimary}}
  {}{0em}{}[\\color{TimelineColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Subsection for column headers
\\titleformat{\\subsection}
  {\\LARGE\\bfseries\\color{TimelineColor}}
  {}{0em}{}
\\titlespacing*{\\subsection}{0pt}{0pt}{10pt}

% Custom commands
\\newcommand{\\timelineevent}[4]{%
    \\begin{tikzpicture}[remember picture]
    \\node[anchor=west, text width=0.85\\linewidth] (content) {%
        \\textbf{\\large\\color{TextPrimary}#1}\\\\
        \\textit{\\color{WorkColor}#2}\\\\
        {\\small\\color{TextSecondary}#3 $\\bullet$ #4}
    };
    \\end{tikzpicture}
}

\\newcommand{\\projectevent}[3]{%
    \\begin{tikzpicture}[remember picture]
    \\node[anchor=west, text width=0.85\\linewidth] (content) {%
        \\textbf{\\large\\color{TextPrimary}#1}\\\\
        {\\small\\color{ProjectColor}#2}\\\\
        {\\small\\color{TextSecondary}#3}
    };
    \\end{tikzpicture}
}

\\newcommand{\\cvdivider}{%
    \\vspace{8pt}
    {\\color{TimelineColor!30}\\hrule}
    \\vspace{8pt}
}

% Timeline markers (drawn at document center)
\\newcommand{\\timelinemarker}{%
    \\begin{tikzpicture}[overlay, remember picture]
    \\fill[TimelineColor] (0,0) circle (3pt);
    \\end{tikzpicture}%
}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=2pt, parsep=0pt}

% Paragraph settings
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

% Column backgrounds
\\backgroundcolor{c[0]}{white}
\\backgroundcolor{c[1]}{white}`;
}

/**
 * Generate centered header
 */
function generateHeader(basics: ResumeData['basics']): string {
  const lines: string[] = [];

  lines.push('\\begin{center}');
  lines.push(`{\\Huge\\bfseries\\color{TextPrimary}${escapeLaTeX(basics.name)}}`);
  lines.push('\\\\[4pt]');
  lines.push(`{\\Large\\color{TimelineColor}${escapeLaTeX(basics.label)}}`);
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

  lines.push(`{\\small\\color{TextSecondary}${contactParts.join(' $\\bullet$ ')}}`);
  lines.push('\\end{center}');

  return lines.join('\n');
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
 * Generate left column - work experience
 */
function generateExperienceColumn(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const lines: string[] = ['\\subsection{Work Timeline}', ''];

  work.forEach((job, index) => {
    const dateRange = formatDateRange(job.startDate, job.endDate);

    lines.push(`\\timelineevent{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)}}{${dateRange}}{${escapeLaTeX(job.location)}}`);
    lines.push('\\\\[4pt]');

    if (job.highlights && job.highlights.length > 0) {
      const [description, ...bulletPoints] = job.highlights;
      lines.push(escapeLaTeX(description));
      if (bulletPoints.length > 0) {
        lines.push(arrayToCompactItemize(bulletPoints));
      }
    }

    if (index < work.length - 1) {
      lines.push('\\cvdivider');
    }
  });

  return lines.join('\n');
}

/**
 * Generate right column - projects
 */
function generateProjectsColumn(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const lines: string[] = ['\\subsection{Project Timeline}', ''];

  projects.forEach((project, index) => {
    const projectUrl = project.url ? escapeLaTeX(cleanURL(project.url)) : '';
    lines.push(`\\projectevent{${escapeLaTeX(project.name)}}{${escapeLaTeX(project.description)}}{${projectUrl}}`);
    lines.push('\\\\[4pt]');

    if (project.highlights && project.highlights.length > 0) {
      lines.push(arrayToCompactItemize(project.highlights));
    }

    if (index < projects.length - 1) {
      lines.push('\\cvdivider');
    }
  });

  return lines.join('\n');
}

/**
 * Generate skills row (full width)
 */
function generateSkillsRow(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const lines: string[] = ['\\section{Technical Skills}', ''];

  skills.forEach((skillGroup) => {
    lines.push(`\\textbf{\\color{WorkColor}${escapeLaTeX(skillGroup.name)}:} ${skillGroup.keywords.map(k => escapeLaTeX(k)).join(' $\\cdot$ ')}`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate education row (full width)
 */
function generateEducationRow(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const lines: string[] = ['\\section{Education}', ''];

  education.forEach((edu) => {
    const degree = `${edu.studyType} of ${edu.area}`;
    const dateRange = formatDateRange(edu.startDate, edu.endDate);

    lines.push(`\\textbf{\\large ${escapeLaTeX(degree)}} \\hfill \\textit{${dateRange}}`);
    lines.push('\\\\');
    lines.push(`\\textit{\\color{ProjectColor}${escapeLaTeX(edu.institution)}} \\hfill ${escapeLaTeX(edu.location)}`);

    if (edu.note) {
      lines.push('\\\\');
      lines.push(`{\\small ${escapeLaTeX(edu.note)}}`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate achievements row (full width)
 */
function generateAchievementsRow(achievements: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = achievements.map(achievement => `  \\item ${escapeLaTeX(achievement)}`).join('\n');

  return `\\section{Achievements \\& Recognition}

\\begin{itemize}
${items}
\\end{itemize}`;
}
