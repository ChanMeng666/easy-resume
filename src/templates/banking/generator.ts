/**
 * Banking & Finance LaTeX Generator
 * Conservative professional resume for finance and consulting
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
 * Generate complete Banking & Finance LaTeX code
 */
export function generateBankingResume(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateEducationSection(data.education),
    generateExperienceSection(data.work),
    generateSkillsSection(data.skills),
    generateAchievementsSection(data.achievements),
    generateCertificationsSection(data.certifications),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with conservative styling
 */
function generatePreamble(): string {
  return `\\documentclass[11pt,a4paper]{article}

% Packages
\\usepackage[left=2cm, right=2cm, top=2cm, bottom=2cm]{geometry}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

% Hyperlinks - conservative black
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=black,
    pdfborder={0 0 0}
}

% Section formatting - traditional with bold uppercase
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{\\MakeUppercase}[\\vspace{2pt}\\hrule\\vspace{4pt}]
\\titlespacing*{\\section}{0pt}{12pt}{8pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\LARGE\\textbf{#1}\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}\\small#1\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{#2} \\hfill #3\\\\
    \\textit{#1} \\hfill #4\\\\[2pt]
}
\\newcommand{\\cvdivider}{\\vspace{6pt}}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing - traditional
\\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=2pt, parsep=0pt}`;
}

/**
 * Generate header with personal information
 */
function generateHeader(basics: ResumeData['basics']): string {
  const name = escapeLaTeX(basics.name);

  // Contact information
  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(
      `\\href{mailto:${escapeURL(basics.email)}}{${escapeLaTeX(basics.email)}}`
    );
  }

  if (basics.phone) {
    contactParts.push(escapeLaTeX(basics.phone));
  }

  if (basics.location) {
    contactParts.push(escapeLaTeX(basics.location));
  }

  // LinkedIn only (most relevant for banking/finance)
  const linkedin = basics.profiles?.find((p) => p.network === 'LinkedIn');
  if (linkedin?.url) {
    contactParts.push(`\\href{${escapeURL(linkedin.url)}}{${escapeLaTeX(cleanURL(linkedin.url))}}`);
  }

  const contact = contactParts.join(' $\\bullet$ ');

  let header = `\\cvname{${name}}`;
  if (basics.label) {
    header += `\n\\begin{center}\\textit{${escapeLaTeX(basics.label)}}\\end{center}`;
  }
  header += `\n\\cvcontact{${contact}}`;

  return header;
}

/**
 * Generate education section (prioritized in banking resumes)
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

  return `\\section*{Education}
${eduEntries}`;
}

/**
 * Generate experience section with focus on metrics
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
 * Generate skills section - simple list format
 */
function generateSkillsSection(skills?: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const category = escapeLaTeX(skillGroup.name);
      const keywords = skillGroup.keywords.map(escapeLaTeX).join(', ');

      return `\\textbf{${category}:} ${keywords}`;
    })
    .join('\\\\[4pt]\n');

  return `\\section*{Skills \\& Competencies}
${skillGroups}`;
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

  return `\\section*{Awards \\& Honors}
\\begin{itemize}
${achievementsList}
\\end{itemize}`;
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

  return `\\section*{Certifications}
\\begin{itemize}
${certList}
\\end{itemize}`;
}
