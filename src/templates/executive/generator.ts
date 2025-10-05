/**
 * Executive Resume LaTeX Generator
 * Professional executive resume for C-level and senior management
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
 * Generate complete Executive Resume LaTeX code
 */
export function generateExecutiveResume(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateExecutiveSummary(data.basics.summary),
    generateExperienceSection(data.work),
    generateEducationSection(data.education),
    generateLeadershipSection(data.achievements),
    generateSkillsSection(data.skills),
    generateCertificationsSection(data.certifications),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with executive styling
 */
function generatePreamble(): string {
  return `\\documentclass[11pt,a4paper]{article}

% Packages
\\usepackage[left=2.5cm, right=2.5cm, top=2cm, bottom=2cm]{geometry}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

% Colors - Executive palette (deep blue and gold)
\\definecolor{PrimaryColor}{HTML}{1e3a8a}
\\definecolor{AccentColor}{HTML}{d97706}
\\definecolor{SecondaryColor}{HTML}{475569}
\\definecolor{GoldColor}{HTML}{eab308}

% Hyperlinks
\\hypersetup{
    colorlinks=true,
    linkcolor=PrimaryColor,
    urlcolor=PrimaryColor,
    pdfborder={0 0 0}
}

% Section formatting - bold and authoritative
\\titleformat{\\section}{\\LARGE\\bfseries\\color{PrimaryColor}}{}{0em}{}[\\color{AccentColor}\\titlerule\\vspace{-8pt}\\color{AccentColor}\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{10pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\Huge\\bfseries\\color{PrimaryColor}#1\\end{center}}
\\newcommand{\\cvtitle}[1]{\\begin{center}\\LARGE\\color{SecondaryColor}#1\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}\\small\\color{SecondaryColor}#1\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{\\large\\color{PrimaryColor}#1} \\hfill \\textcolor{SecondaryColor}{\\textbf{#3}}\\\\
    \\textit{\\color{AccentColor}#2} \\hfill \\textcolor{SecondaryColor}{#4}\\\\[4pt]
}
\\newcommand{\\cvdivider}{\\vspace{8pt}}
\\newcommand{\\cvtag}[1]{%
    \\colorbox{PrimaryColor!15}{\\color{PrimaryColor}\\small\\textbf{#1}}\\hspace{2pt}%
}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing - professional spacing
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=3pt, parsep=0pt}`;
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

  const contact = contactParts.join(' \\textcolor{SecondaryColor}{|} ');

  return `\\cvname{${name}}
\\vspace{4pt}
\\cvtitle{${title}}
\\vspace{4pt}
\\cvcontact{${contact}}`;
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section*{\\textcolor{PrimaryColor}{Executive Summary}}
${escapeLaTeX(summary)}`;
}

/**
 * Generate experience section with emphasis on leadership
 */
function generateExperienceSection(work?: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const workEntries = work
    .map((job) => {
      const company = escapeLaTeX(job.company);
      const position = escapeLaTeX(job.position);
      const dateRange = formatDateRange(job.startDate, job.endDate);
      const location = job.location ? escapeLaTeX(job.location) : '';

      let entry = `\\cvevent{${position}}{${company}}{${dateRange}}{${location}}`;

      if (job.highlights && job.highlights.length > 0) {
        entry += '\n' + arrayToCompactItemize(job.highlights);
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{\\textcolor{PrimaryColor}{Professional Experience}}
${workEntries}`;
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
        entry += '\n' + details.join(' | ');
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{\\textcolor{PrimaryColor}{Education}}
${eduEntries}`;
}

/**
 * Generate leadership & achievements section
 */
function generateLeadershipSection(achievements?: ResumeData['achievements']): string {
  if (!achievements || achievements.length === 0) return '';

  const achievementsList = achievements
    .map((achievement) => {
      return `\\item ${escapeLaTeX(achievement)}`;
    })
    .join('\n');

  return `\\section*{\\textcolor{PrimaryColor}{Leadership \\& Achievements}}
\\begin{itemize}
${achievementsList}
\\end{itemize}`;
}

/**
 * Generate skills section with tags
 */
function generateSkillsSection(skills?: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const category = escapeLaTeX(skillGroup.name);
      const keywords = skillGroup.keywords.map((kw) => `\\cvtag{${escapeLaTeX(kw)}}`).join(' ');

      return `\\textbf{\\color{SecondaryColor}${category}:}\\\\[4pt]\n${keywords}`;
    })
    .join('\n\n\\vspace{6pt}\n\n');

  return `\\section*{\\textcolor{PrimaryColor}{Core Competencies}}
${skillGroups}`;
}

/**
 * Generate certifications section
 */
function generateCertificationsSection(certifications?: ResumeData['certifications']): string {
  if (!certifications || certifications.length === 0) return '';

  const certList = certifications
    .map((cert) => {
      return `\\item ${escapeLaTeX(cert)}`;
    })
    .join('\n');

  return `\\section*{\\textcolor{PrimaryColor}{Professional Certifications}}
\\begin{itemize}
${certList}
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
