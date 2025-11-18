/**
 * Modern CV LaTeX Generator
 * Single-column modern resume with clean design
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
 * Generate complete Modern CV LaTeX code
 */
export function generateModernCV(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateSummary(data.basics.summary),
    generateExperienceSection(data.work),
    generateEducationSection(data.education),
    generateProjectsSection(data.projects),
    generateSkillsSection(data.skills),
    generateAchievementsSection(data.achievements),
    generateCertificationsSection(data.certifications),
    generateReferencesSection(data.references),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with modern styling
 */
function generatePreamble(): string {
  return `\\documentclass[11pt,a4paper]{article}

% Packages
\\usepackage[left=2cm, right=2cm, top=2cm, bottom=2cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

% Colors - Modern minimalist palette
\\definecolor{PrimaryColor}{HTML}{1a1a1a}
\\definecolor{AccentColor}{HTML}{2563eb}
\\definecolor{SecondaryColor}{HTML}{64748b}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=AccentColor,
    urlcolor=AccentColor,
    pdfborder={0 0 0}
}

% Section formatting
\\titleformat{\\section}{\\Large\\bfseries\\color{PrimaryColor}}{}{0em}{}[\\color{AccentColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\Huge\\bfseries\\color{PrimaryColor}#1\\end{center}}
\\newcommand{\\cvtitle}[1]{\\begin{center}\\large\\color{SecondaryColor}#1\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}\\small\\color{SecondaryColor}#1\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{#1} \\hfill \\textcolor{SecondaryColor}{#3}\\\\
    \\textit{\\color{SecondaryColor}#2} \\hfill \\textcolor{SecondaryColor}{#4}\\\\[4pt]
}
\\newcommand{\\cvdivider}{\\vspace{6pt}}
\\newcommand{\\cvtag}[1]{%
    \\colorbox{AccentColor!10}{\\color{AccentColor}\\small\\textbf{#1}}\\hspace{2pt}%
}

% Remove page numbers
\\pagenumbering{gobble}

% Paragraph formatting - eliminate indentation for modern clean look
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=0pt, itemsep=2pt, parsep=0pt}`;
}

/**
 * Generate header with personal information
 */
function generateHeader(basics: ResumeData['basics']): string {
  const name = escapeLaTeX(basics.name);
  const title = escapeLaTeX(basics.label);

  // Contact information
  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(`\\faEnvelope\\ \\href{mailto:${basics.email}}{${escapeLaTeX(basics.email)}}`);
  }

  if (basics.phone) {
    contactParts.push(`\\faPhone\\ ${escapeLaTeX(basics.phone)}`);
  }

  if (basics.location) {
    contactParts.push(`\\faMapMarker\\ ${escapeLaTeX(basics.location)}`);
  }

  // Social profiles
  basics.profiles?.forEach((profile) => {
    const icon = getProfileIcon(profile.network);
    const displayUrl = cleanURL(profile.url);
    contactParts.push(`${icon}\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(displayUrl)}}`);
  });

  const contactLine = contactParts.join(' ~ ');

  return `\\cvname{${name}}
\\vspace{4pt}
\\cvtitle{${title}}
\\vspace{6pt}
\\cvcontact{${contactLine}}`;
}

/**
 * Get FontAwesome icon for social profile
 */
function getProfileIcon(network: string): string {
  const icons: Record<string, string> = {
    LinkedIn: '\\faLinkedin',
    GitHub: '\\faGithub',
    Portfolio: '\\faGlobe',
  };
  return icons[network] || '\\faGlobe';
}

/**
 * Generate summary section
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  // Escape LaTeX and add \noindent before each paragraph to prevent indentation
  const escapedSummary = escapeLaTeX(summary);
  // Replace paragraph breaks with \noindent command for extra safety
  const formattedSummary = escapedSummary.replace(/\n\n/g, '\n\n\\noindent ');

  return `\\section{Summary}
\\noindent ${formattedSummary}`;
}

/**
 * Generate work experience section
 */
function generateExperienceSection(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const experiences = work
    .map((job) => {
      const highlights = job.highlights?.length > 0
        ? '\n' + arrayToCompactItemize(job.highlights)
        : '';

      return `\\cvevent{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)}}{${formatDateRange(job.startDate, job.endDate)}}{${escapeLaTeX(job.location)}}${highlights}\\cvdivider`;
    })
    .join('\n\n');

  return `\\section{Work Experience}\n${experiences}`;
}

/**
 * Generate education section
 */
function generateEducationSection(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const entries = education
    .map((edu) => {
      const degree = `${escapeLaTeX(edu.studyType)} in ${escapeLaTeX(edu.area)}`;
      const gpaNote = edu.gpa ? `\\\\GPA: ${escapeLaTeX(edu.gpa)}` : '';
      const note = edu.note ? `\\\\${escapeLaTeX(edu.note)}` : '';

      return `\\cvevent{${degree}}{${escapeLaTeX(edu.institution)}}{${formatDateRange(edu.startDate, edu.endDate)}}{${escapeLaTeX(edu.location)}}${gpaNote}${note}\\cvdivider`;
    })
    .join('\n\n');

  return `\\section{Education}\n${entries}`;
}

/**
 * Generate projects section
 */
function generateProjectsSection(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const projectEntries = projects
    .map((project) => {
      const projectHeader = project.url
        ? `\\textbf{\\href{${escapeURL(project.url)}}{${escapeLaTeX(project.name)}}}`
        : `\\textbf{${escapeLaTeX(project.name)}}`;

      const description = escapeLaTeX(project.description);
      const highlights = project.highlights?.length > 0
        ? '\n' + arrayToCompactItemize(project.highlights)
        : '';

      return `${projectHeader}\\\\${description}${highlights}\\cvdivider`;
    })
    .join('\n\n');

  return `\\section{Projects}\n${projectEntries}`;
}

/**
 * Generate skills section
 */
function generateSkillsSection(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const tags = skillGroup.keywords
        .map((keyword) => `\\cvtag{${escapeLaTeX(keyword)}}`)
        .join(' ');

      return `\\textbf{${escapeLaTeX(skillGroup.name)}:} ${tags}`;
    })
    .join('\\\\[6pt]\n');

  return `\\section{Skills}\n${skillGroups}`;
}

/**
 * Generate achievements section
 */
function generateAchievementsSection(achievements?: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = arrayToCompactItemize(achievements);
  return `\\section{Achievements}\n${items}`;
}

/**
 * Generate certifications section
 */
function generateCertificationsSection(certifications?: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const items = arrayToCompactItemize(certifications);
  return `\\section{Certifications}\n${items}`;
}

/**
 * Generate references section
 */
function generateReferencesSection(references?: string): string {
  if (!references) return '';

  // Escape LaTeX and add \noindent before each paragraph to prevent indentation
  const escapedReferences = escapeLaTeX(references);
  const formattedReferences = escapedReferences.replace(/\n\n/g, '\n\n\\noindent ');

  return `\\section{References}
\\noindent ${formattedReferences}`;
}
