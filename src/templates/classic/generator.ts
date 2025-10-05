/**
 * Classic Academic LaTeX Generator
 * Traditional academic CV style
 */

import { ResumeData } from '@/lib/validation/schema';
import {
  escapeLaTeX,
  formatDateRange,
  arrayToCompactItemize,
  cleanURL,
} from '@/lib/latex/utils';

/**
 * Generate complete Classic CV LaTeX code
 */
export function generateClassicCV(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateEducationSection(data.education),
    generateExperienceSection(data.work),
    generatePublicationsSection(data.projects), // In academic CVs, projects can be publications
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
 * Generate LaTeX preamble with classic styling
 */
function generatePreamble(): string {
  return `\\documentclass[11pt,a4paper]{article}

% Packages
\\usepackage[left=2.5cm, right=2.5cm, top=2.5cm, bottom=2.5cm]{geometry}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

% Hyperlinks - conservative colors
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=blue!50!black,
    pdfborder={0 0 0}
}

% Section formatting - classic style
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{\\MakeUppercase}[\\hrule]
\\titlespacing*{\\section}{0pt}{16pt}{12pt}

% Subsection formatting
\\titleformat{\\subsection}{\\normalsize\\bfseries}{}{0em}{}
\\titlespacing*{\\subsection}{0pt}{12pt}{6pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\LARGE\\textsc{#1}\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}\\small#1\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{#1}, \\textit{#2}\\hfill #3\\\\
    \\textit{#4}\\\\[4pt]
}
\\newcommand{\\cvdivider}{\\vspace{8pt}}

% Remove page numbers
\\pagenumbering{gobble}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=4pt, itemsep=2pt, parsep=0pt}`;
}

/**
 * Generate header with personal information
 */
function generateHeader(basics: ResumeData['basics']): string {
  const name = escapeLaTeX(basics.name);

  // Contact information
  const contactParts: string[] = [];

  if (basics.email) {
    contactParts.push(`\\faEnvelope\\ ${escapeLaTeX(basics.email)}`);
  }

  if (basics.phone) {
    contactParts.push(`\\faPhone\\ ${escapeLaTeX(basics.phone)}`);
  }

  if (basics.location) {
    contactParts.push(`\\faMapMarker\\ ${escapeLaTeX(basics.location)}`);
  }

  // Social profiles
  basics.profiles?.forEach((profile) => {
    const displayUrl = cleanURL(profile.url);
    contactParts.push(`${escapeLaTeX(displayUrl)}`);
  });

  const contactLine = contactParts.join(' $\\mid$ ');

  let header = `\\cvname{${name}}`;

  if (basics.label) {
    header += `\n\\begin{center}\\textit{${escapeLaTeX(basics.label)}}\\end{center}`;
  }

  header += `\n\\vspace{8pt}\n\\cvcontact{${contactLine}}`;

  if (basics.summary) {
    header += `\n\n\\vspace{12pt}\n\\noindent ${escapeLaTeX(basics.summary)}`;
  }

  return header;
}

/**
 * Generate education section
 */
function generateEducationSection(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const entries = education
    .map((edu) => {
      const degree = `${escapeLaTeX(edu.studyType)} in ${escapeLaTeX(edu.area)}`;
      const dateLocation = `${formatDateRange(edu.startDate, edu.endDate)}`;

      let entry = `\\cvevent{${degree}}{${escapeLaTeX(edu.institution)}}{${dateLocation}}{${escapeLaTeX(edu.location)}}`;

      if (edu.gpa) {
        entry += `\\textit{GPA: ${escapeLaTeX(edu.gpa)}}\\\\[4pt]`;
      }

      if (edu.note) {
        entry += `${escapeLaTeX(edu.note)}\\\\[4pt]`;
      }

      entry += '\\cvdivider';

      return entry;
    })
    .join('\n\n');

  return `\\section{Education}\n${entries}`;
}

/**
 * Generate work experience section
 */
function generateExperienceSection(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const experiences = work
    .map((job) => {
      const dateLocation = `${formatDateRange(job.startDate, job.endDate)}`;

      let experience = `\\cvevent{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)}}{${dateLocation}}{${escapeLaTeX(job.location)}}`;

      if (job.highlights && job.highlights.length > 0) {
        experience += '\n' + arrayToCompactItemize(job.highlights);
      }

      experience += '\\cvdivider';

      return experience;
    })
    .join('\n\n');

  return `\\section{Professional Experience}\n${experiences}`;
}

/**
 * Generate publications/projects section
 */
function generatePublicationsSection(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const entries = projects
    .map((project, index) => {
      let entry = `${index + 1}. `;

      if (project.url) {
        entry += `\\textbf{${escapeLaTeX(project.name)}} \\href{${project.url}}{[Link]}`;
      } else {
        entry += `\\textbf{${escapeLaTeX(project.name)}}`;
      }

      entry += `\\\\ ${escapeLaTeX(project.description)}`;

      if (project.highlights && project.highlights.length > 0) {
        entry += '\n' + arrayToCompactItemize(project.highlights);
      }

      entry += '\\cvdivider';

      return entry;
    })
    .join('\n\n');

  return `\\section{Research \\& Projects}\n${entries}`;
}

/**
 * Generate skills section
 */
function generateSkillsSection(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const keywords = skillGroup.keywords.map(k => escapeLaTeX(k)).join(', ');
      return `\\textbf{${escapeLaTeX(skillGroup.name)}:} ${keywords}`;
    })
    .join('\\\\[6pt]\n');

  return `\\section{Skills \\& Competencies}\n${skillGroups}`;
}

/**
 * Generate achievements section
 */
function generateAchievementsSection(achievements?: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  const items = arrayToCompactItemize(achievements);
  return `\\section{Honors \\& Awards}\n${items}`;
}

/**
 * Generate certifications section
 */
function generateCertificationsSection(certifications?: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const items = arrayToCompactItemize(certifications);
  return `\\section{Certifications \\& Licenses}\n${items}`;
}

/**
 * Generate references section
 */
function generateReferencesSection(references?: string): string {
  if (!references) return '';

  return `\\section{References}\n${escapeLaTeX(references)}`;
}
