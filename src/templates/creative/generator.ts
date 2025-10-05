/**
 * Creative Portfolio LaTeX Generator v4.0
 * Complete redesign: Single-column layout with creative header and styling
 * Abandons paracol for reliable pagination
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
 * Generate complete Creative Portfolio LaTeX code
 */
export function generateCreativePortfolio(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateSummary(data.basics.summary),
    generateSkillsSection(data.skills),
    generateExperienceSection(data.work),
    generateProjectsSection(data.projects),
    generateEducationSection(data.education),
    generateAchievementsSection(data.achievements),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with modern creative styling
 */
function generatePreamble(): string {
  return `\\documentclass[10pt,a4paper]{article}

% Packages
\\usepackage[left=1.5cm, right=1.5cm, top=1cm, bottom=2cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}
\\usepackage{tikz}

% Colors - Creative gradient palette
\\definecolor{PrimaryPurple}{HTML}{7c3aed}
\\definecolor{AccentPink}{HTML}{ec4899}
\\definecolor{LightPurple}{HTML}{c4b5fd}
\\definecolor{MainText}{HTML}{1f2937}
\\definecolor{SecondaryText}{HTML}{6b7280}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=PrimaryPurple,
    urlcolor=PrimaryPurple,
    pdfborder={0 0 0}
}

% Section formatting - creative gradient style
\\titleformat{\\section}
  {\\Large\\bfseries\\color{PrimaryPurple}}
  {}{0em}{}
  [\\vspace{-8pt}{\\color{AccentPink}\\titlerule[2pt]}\\vspace{4pt}]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Custom commands
\\newcommand{\\cvtag}[1]{%
    \\tikz[baseline=(char.base)]{%
        \\node[shape=rectangle, rounded corners=3pt, draw=PrimaryPurple,
              fill=PrimaryPurple!15, inner sep=3pt, text=PrimaryPurple] (char) {\\small\\textbf{#1}};%
    }\\hspace{3pt}%
}

\\newcommand{\\cvevent}[4]{%
    \\textbf{\\large\\color{PrimaryPurple}#1} \\hfill \\textcolor{SecondaryText}{\\textit{#3}}\\\\
    \\textit{\\color{SecondaryText}#2} \\hfill \\textcolor{SecondaryText}{#4}\\\\[6pt]
}

\\newcommand{\\cvdivider}{\\vspace{8pt}}

% Page numbering
\\pagenumbering{arabic}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=3pt, parsep=0pt}

% Paragraph spacing
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}`;
}

/**
 * Generate creative header with contact info
 */
function generateHeader(basics: ResumeData['basics']): string {
  const name = escapeLaTeX(basics.name);
  const title = escapeLaTeX(basics.label);

  // Contact info
  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(
      `\\faEnvelope\\ \\href{mailto:${escapeURL(basics.email)}}{${escapeLaTeX(basics.email)}}`
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
      const displayText = profile.label || cleanURL(profile.url);
      contactParts.push(
        `${icon}\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(displayText)}}`
      );
    }
  });

  const contactLine = contactParts.join(' \\textcolor{LightPurple}{$\\bullet$} ');

  return `% Creative header with gradient accent
\\begin{center}
\\begin{tikzpicture}[remember picture, overlay]
  \\fill[PrimaryPurple] (current page.north west) rectangle ([yshift=-3.5cm]current page.north east);
  \\fill[AccentPink] ([yshift=-3.5cm]current page.north west) rectangle ([yshift=-4cm]current page.north east);
\\end{tikzpicture}

\\vspace{0.5cm}
{\\Huge\\bfseries\\color{white}${name}}\\\\[8pt]
{\\Large\\color{white}${title}}\\\\[12pt]
{\\small\\color{white}${contactLine}}
\\end{center}

\\vspace{0.8cm}`;
}

/**
 * Generate summary section
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section*{About Me}
${escapeLaTeX(summary)}`;
}

/**
 * Generate skills section with tag cloud
 */
function generateSkillsSection(skills?: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillTags = skills
    .map((skillGroup) => {
      const category = escapeLaTeX(skillGroup.name);
      const tags = skillGroup.keywords.map((kw) => `\\cvtag{${escapeLaTeX(kw)}}`).join(' ');
      return `\\textbf{\\color{PrimaryPurple}${category}:} ${tags}`;
    })
    .join('\\\\[8pt]\n');

  return `\\section*{Skills}
${skillTags}`;
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
        entry += '\n' + arrayToCompactItemize(job.highlights);
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Professional Experience}
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

      let entry = `\\textbf{\\large\\color{PrimaryPurple}${name}}`;
      if (project.url) {
        entry = `\\href{${escapeURL(project.url)}}{${entry}}`;
      }
      entry += `\\\\[4pt]`;

      if (description) {
        entry += `\n{\\color{SecondaryText}${description}}\\\\[4pt]`;
      }

      if (project.highlights && project.highlights.length > 0) {
        entry += '\n' + arrayToCompactItemize(project.highlights);
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Featured Projects}
${projectEntries}`;
}

/**
 * Generate education section
 */
function generateEducationSection(education?: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const eduEntries = education
    .map((edu) => {
      const degree = [edu.studyType, edu.area].filter(Boolean).map(escapeLaTeX).join(' in ');
      const institution = escapeLaTeX(edu.institution);
      const dateRange = formatDateRange(edu.startDate, edu.endDate);
      const location = edu.location ? escapeLaTeX(edu.location) : '';

      let entry = `\\textbf{\\large\\color{PrimaryPurple}${degree}}\\\\
\\textit{${institution}} \\hfill \\textcolor{SecondaryText}{${dateRange}}`;

      if (location) {
        entry += `\\\\\n\\textcolor{SecondaryText}{${location}}`;
      }

      const details: string[] = [];
      if (edu.gpa) {
        details.push(`GPA: ${escapeLaTeX(edu.gpa)}`);
      }
      if (edu.note) {
        details.push(escapeLaTeX(edu.note));
      }

      if (details.length > 0) {
        entry += `\\\\\n\\textcolor{SecondaryText}{${details.join(' | ')}}`;
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Education}
${eduEntries}`;
}

/**
 * Generate achievements section
 */
function generateAchievementsSection(achievements?: ResumeData['achievements']): string {
  if (!achievements || achievements.length === 0) return '';

  const achievementsList = achievements
    .map((achievement) => {
      return `\\item ${escapeLaTeX(achievement)}`;
    })
    .join('\n');

  return `\\section*{Awards \\& Recognition}
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
    Behance: '\\faBehance',
    Dribbble: '\\faDribbble',
    Portfolio: '\\faGlobe',
  };
  return icons[network] || '\\faGlobe';
}
