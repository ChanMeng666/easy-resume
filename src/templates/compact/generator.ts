/**
 * Compact One-Page LaTeX Generator
 * Space-efficient resume for entry-level and student positions
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
 * Generate complete Compact One-Page LaTeX code
 */
export function generateCompactResume(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateSummary(data.basics.summary),
    generateEducationSection(data.education),
    generateExperienceSection(data.work),
    generateProjectsSection(data.projects),
    generateSkillsSection(data.skills),
    generateAchievementsSection(data.achievements),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with compact styling
 */
function generatePreamble(): string {
  return `\\documentclass[9pt,a4paper]{extarticle}

% Packages
\\usepackage[left=1cm, right=1cm, top=1cm, bottom=1cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{multicol}

% Colors - Simple and clean
\\definecolor{PrimaryColor}{HTML}{0f172a}
\\definecolor{AccentColor}{HTML}{0284c7}
\\definecolor{SecondaryColor}{HTML}{64748b}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=AccentColor,
    urlcolor=AccentColor,
    pdfborder={0 0 0}
}

% Section formatting - compact
\\titleformat{\\section}{\\large\\bfseries\\color{PrimaryColor}}{}{0em}{}[\\color{AccentColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{6pt}{3pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\LARGE\\bfseries\\color{PrimaryColor}#1\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}{\\small\\color{SecondaryColor}#1}\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{#1} | \\textit{#2} \\hfill \\textcolor{SecondaryColor}{\\small #3}\\\\
    {\\small\\color{SecondaryColor}#4}\\\\[2pt]
}
\\newcommand{\\cvdivider}{\\vspace{3pt}}
\\newcommand{\\cvtag}[1]{%
    \\colorbox{AccentColor!15}{\\color{AccentColor}\\scriptsize\\textbf{#1}}\\hspace{1pt}%
}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing - very compact
\\setlist[itemize]{leftmargin=*, topsep=0pt, itemsep=0pt, parsep=0pt, label=$\\bullet$}

% Reduce spacing globally
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}`;
}

/**
 * Generate compact header with personal information
 */
function generateHeader(basics: ResumeData['basics']): string {
  const name = escapeLaTeX(basics.name);

  // Contact information
  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(
      `\\href{mailto:${escapeURL(basics.email)}}{\\faEnvelope\\ ${escapeLaTeX(basics.email)}}`
    );
  }

  if (basics.phone) {
    contactParts.push(`\\faPhone\\ ${escapeLaTeX(basics.phone)}`);
  }

  if (basics.location) {
    contactParts.push(`\\faMapMarker\\ ${escapeLaTeX(basics.location)}`);
  }

  // Social profiles
  basics.profiles?.forEach((profile) => {
    if (profile.network && profile.url) {
      const icon = getProfileIcon(profile.network);
      const displayUrl = cleanURL(profile.url);
      contactParts.push(
        `\\href{${escapeURL(profile.url)}}{${icon}\\ ${escapeLaTeX(displayUrl)}}`
      );
    }
  });

  const contact = contactParts.join(' | ');

  let header = `\\cvname{${name}}`;
  if (basics.label) {
    header += `\n\\begin{center}{\\small\\textit{\\color{SecondaryColor}${escapeLaTeX(basics.label)}}}\\end{center}`;
  }
  header += `\n\\cvcontact{${contact}}`;

  return header;
}

/**
 * Generate summary section
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section*{Summary}
{\\small ${escapeLaTeX(summary)}}`;
}

/**
 * Generate education section
 */
function generateEducationSection(education?: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const eduEntries = education
    .map((edu) => {
      const institution = escapeLaTeX(edu.institution);
      const degree = [edu.studyType, edu.area]
        .filter(Boolean)
        .map(escapeLaTeX)
        .join(' in ');
      const dateRange = formatDateRange(edu.startDate, edu.endDate);
      const location = edu.location ? escapeLaTeX(edu.location) : '';

      let entry = `\\cvevent{${degree}}{${institution}}{${dateRange}}{${location}}`;

      const details: string[] = [];
      if (edu.gpa) {
        details.push(`GPA: ${escapeLaTeX(edu.gpa)}`);
      }
      if (edu.note) {
        details.push(escapeLaTeX(edu.note));
      }

      if (details.length > 0) {
        entry += `\n{\\small ${details.join(' | ')}}\\\\[2pt]`;
      }

      return entry;
    })
    .join('\n\n');

  return `\\section*{Education}
${eduEntries}`;
}

/**
 * Generate experience section
 */
function generateExperienceSection(work?: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const workEntries = work
    .map((job) => {
      const position = escapeLaTeX(job.position);
      const company = escapeLaTeX(job.company);
      const dateRange = formatDateRange(job.startDate, job.endDate);
      const location = job.location ? escapeLaTeX(job.location) : '';

      let entry = `\\cvevent{${position}}{${company}}{${dateRange}}{${location}}`;

      if (job.highlights && job.highlights.length > 0) {
        // Limit to top 3 highlights for compact layout
        const topHighlights = job.highlights.slice(0, 3);
        entry += '\n{\\small';
        entry += '\n' + arrayToCompactItemize(topHighlights);
        entry += '\n}';
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Experience}
${workEntries}`;
}

/**
 * Generate projects section
 */
function generateProjectsSection(projects?: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const projectEntries = projects
    .map((project) => {
      const name = escapeLaTeX(project.name);
      const description = project.description ? escapeLaTeX(project.description) : '';

      let entry = `\\textbf{${name}}`;
      if (project.url) {
        entry = `\\href{${escapeURL(project.url)}}{${entry}}`;
      }
      entry += `\\\\[2pt]`;

      if (description) {
        entry += `\n{\\small ${description}}\\\\[2pt]`;
      }

      if (project.highlights && project.highlights.length > 0) {
        const topHighlights = project.highlights.slice(0, 2);
        entry += '\n{\\small';
        entry += '\n' + arrayToCompactItemize(topHighlights);
        entry += '\n}';
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Projects}
${projectEntries}`;
}

/**
 * Generate skills section with tag cloud layout
 */
function generateSkillsSection(skills?: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const category = escapeLaTeX(skillGroup.name);
      const keywords = skillGroup.keywords.map((kw) => `\\cvtag{${escapeLaTeX(kw)}}`).join(' ');

      return `\\textbf{\\small ${category}:} ${keywords}`;
    })
    .join('\\\\[3pt]\n');

  return `\\section*{Skills}
${skillGroups}`;
}

/**
 * Generate achievements section
 */
function generateAchievementsSection(achievements?: ResumeData['achievements']): string {
  if (!achievements || achievements.length === 0) return '';

  const achievementsList = achievements
    .map((achievement) => {
      return `\\item {\\small ${escapeLaTeX(achievement)}}`;
    })
    .join('\n');

  return `\\section*{Achievements}
\\begin{itemize}
${achievementsList}
\\end{itemize}`;
}

/**
 * Get FontAwesome icon for social profile
 */
function getProfileIcon(network: string): string {
  const icons: Record<string, string> = {
    LinkedIn: '\\faLinkedin',
    GitHub: '\\faGithub',
    Twitter: '\\faTwitter',
    Portfolio: '\\faGlobe',
  };
  return icons[network] || '\\faGlobe';
}
