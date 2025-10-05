/**
 * Academic Research LaTeX Generator
 * Comprehensive CV for researchers and academics
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
 * Generate complete Academic Research LaTeX code
 */
export function generateAcademicCV(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    generateResearchInterests(data.basics.summary),
    generateEducationSection(data.education),
    generateResearchExperienceSection(data.work),
    generatePublicationsSection(data.projects),
    generateAchievementsSection(data.achievements),
    generateSkillsSection(data.skills),
    generateCertificationsSection(data.certifications),
    generateReferencesSection(data.references),
    '',
    '\\end{document}',
  ];

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Generate LaTeX preamble with academic styling
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

% Hyperlinks - academic style
\\hypersetup{
    colorlinks=true,
    linkcolor=blue!50!black,
    urlcolor=blue!50!black,
    pdfborder={0 0 0}
}

% Section formatting - traditional academic
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{\\MakeUppercase}[\\vspace{2pt}\\hrule]
\\titlespacing*{\\section}{0pt}{16pt}{10pt}

% Subsection formatting
\\titleformat{\\subsection}{\\normalsize\\bfseries}{}{0em}{}
\\titlespacing*{\\subsection}{0pt}{10pt}{6pt}

% Custom commands
\\newcommand{\\cvname}[1]{\\begin{center}\\LARGE\\textsc{#1}\\end{center}}
\\newcommand{\\cvcontact}[1]{\\begin{center}\\small#1\\end{center}}
\\newcommand{\\cvevent}[4]{%
    \\textbf{#1}, \\textit{#2}\\hfill #3\\\\
    #4\\\\[4pt]
}
\\newcommand{\\cvdivider}{\\vspace{8pt}}
\\newcommand{\\publication}[1]{%
    \\item #1
}

% Page numbers for multi-page CV
\\pagenumbering{arabic}

% List spacing
\\setlist[itemize]{leftmargin=*, topsep=4pt, itemsep=2pt, parsep=0pt}
\\setlist[enumerate]{leftmargin=*, topsep=4pt, itemsep=3pt, parsep=0pt}`;
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
      const displayUrl = cleanURL(profile.url);
      contactParts.push(
        `${icon}\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(displayUrl)}}`
      );
    }
  });

  const contact = contactParts.join(' $\\bullet$ ');

  let header = `\\cvname{${name}}`;
  if (basics.label) {
    header += `\n\\begin{center}\\textit{${escapeLaTeX(basics.label)}}\\end{center}`;
  }
  header += `\n\\cvcontact{${contact}}`;

  return header;
}

/**
 * Generate research interests section
 */
function generateResearchInterests(summary?: string): string {
  if (!summary) return '';

  return `\\section*{Research Interests}
${escapeLaTeX(summary)}`;
}

/**
 * Generate education section with academic details
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
 * Generate research experience section
 */
function generateResearchExperienceSection(work?: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const workEntries = work
    .map((job) => {
      const position = escapeLaTeX(job.position);
      const institution = escapeLaTeX(job.company);
      const dateRange = formatDateRange(job.startDate, job.endDate);
      const location = job.location ? escapeLaTeX(job.location) : '';

      let entry = `\\cvevent{${position}}{${institution}}{${dateRange}}{${location}}`;

      if (job.highlights && job.highlights.length > 0) {
        entry += '\n' + arrayToCompactItemize(job.highlights);
      }

      return entry;
    })
    .join('\n\n\\cvdivider\n\n');

  return `\\section*{Research Experience}
${workEntries}`;
}

/**
 * Generate publications section (uses projects data)
 */
function generatePublicationsSection(projects?: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const publications = projects
    .map((project) => {
      const name = escapeLaTeX(project.name);
      const description = project.description ? escapeLaTeX(project.description) : '';

      let pub = `\\textbf{${name}}`;

      if (description) {
        pub += `\n\n${description}`;
      }

      if (project.url) {
        pub += `\n\n\\href{${escapeURL(project.url)}}{${escapeURL(project.url)}}`;
      }

      if (project.highlights && project.highlights.length > 0) {
        pub += '\n\n' + arrayToCompactItemize(project.highlights);
      }

      return `\\publication{${pub}}`;
    })
    .join('\n\n');

  return `\\section*{Publications \\& Research Projects}
\\begin{enumerate}
${publications}
\\end{enumerate}`;
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
 * Generate skills section
 */
function generateSkillsSection(skills?: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const skillGroups = skills
    .map((skillGroup) => {
      const category = escapeLaTeX(skillGroup.name);
      const keywords = skillGroup.keywords.map(escapeLaTeX).join(', ');

      return `\\textbf{${category}:} ${keywords}`;
    })
    .join('\\\\[6pt]\n');

  return `\\section*{Technical Skills}
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

  return `\\section*{Certifications \\& Professional Development}
\\begin{itemize}
${certList}
\\end{itemize}`;
}

/**
 * Generate references section
 */
function generateReferencesSection(references?: ResumeData['references']): string {
  if (!references) return '';

  return `\\section*{References}
${escapeLaTeX(references)}`;
}

/**
 * Get FontAwesome icon for social profile
 */
function getProfileIcon(network: string): string {
  const icons: Record<string, string> = {
    LinkedIn: '\\faLinkedin',
    GitHub: '\\faGithub',
    'Google Scholar': '\\faGraduationCap',
    ORCID: '\\faOrcid',
    ResearchGate: '\\faResearchgate',
    Portfolio: '\\faGlobe',
  };
  return icons[network] || '\\faGlobe';
}
