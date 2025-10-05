/**
 * Awesome CV LaTeX Generator
 * Inspired by posquit0's Awesome-CV template
 * Converts the custom .cls styles to standard LaTeX packages for Overleaf compatibility
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
 * Generate complete Awesome CV LaTeX code
 */
export function generateAwesomeCV(data: ResumeData): string {
  const sections = [
    generatePreamble(),
    '\\begin{document}',
    '',
    generateHeader(data.basics),
    '',
    // Main content sections
    generateSummary(data.basics.summary),
    generateExperienceSection(data.work),
    generateProjectsSection(data.projects),
    generateEducationSection(data.education),
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
 * Generate LaTeX preamble with Awesome-CV styling
 * Extracts and converts styles from awesome-cv.cls to standard packages
 */
function generatePreamble(): string {
  return `% Awesome CV LaTeX Template
% Inspired by posquit0's Awesome-CV (https://github.com/posquit0/Awesome-CV)
% Converted to use standard LaTeX packages for Overleaf compatibility

\\documentclass[11pt, a4paper]{article}

%-------------------------------------------------------------------------------
% PACKAGES
%-------------------------------------------------------------------------------
% Page layout
\\usepackage[left=2.0cm, top=1.5cm, right=2.0cm, bottom=2.0cm, footskip=.5cm]{geometry}

% Font and text formatting
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}  % Latin Modern font (similar to Source Sans Pro)
\\usepackage{microtype}

% Colors
\\usepackage[dvipsnames]{xcolor}

% Icons
\\usepackage{fontawesome5}

% Links
\\usepackage{hyperref}

% Lists
\\usepackage{enumitem}

% Section formatting
\\usepackage{titlesec}

% Tables for layout
\\usepackage{array}
\\usepackage{tabularx}

%-------------------------------------------------------------------------------
% COLOR DEFINITIONS (from awesome-cv.cls)
%-------------------------------------------------------------------------------
% Gray-scale colors
\\definecolor{white}{HTML}{FFFFFF}
\\definecolor{black}{HTML}{000000}
\\definecolor{darkgray}{HTML}{333333}
\\definecolor{gray}{HTML}{5D5D5D}
\\definecolor{lightgray}{HTML}{999999}

% Awesome color themes
\\definecolor{awesome-emerald}{HTML}{00A388}
\\definecolor{awesome-skyblue}{HTML}{0395DE}
\\definecolor{awesome-red}{HTML}{DC3522}
\\definecolor{awesome-pink}{HTML}{EF4089}
\\definecolor{awesome-orange}{HTML}{FF6138}
\\definecolor{awesome-nephritis}{HTML}{27AE60}
\\definecolor{awesome-concrete}{HTML}{95A5A6}
\\definecolor{awesome-darknight}{HTML}{131A28}

% Set default awesome color (can be changed)
\\colorlet{awesome}{awesome-red}

% Text colors
\\definecolor{darktext}{HTML}{414141}
\\colorlet{text}{darkgray}
\\colorlet{graytext}{gray}
\\colorlet{lighttext}{lightgray}

%-------------------------------------------------------------------------------
% HYPERLINK SETUP
%-------------------------------------------------------------------------------
\\hypersetup{
    colorlinks=true,
    linkcolor=awesome,
    urlcolor=awesome,
    pdfborder={0 0 0}
}

%-------------------------------------------------------------------------------
% SECTION FORMATTING
%-------------------------------------------------------------------------------
% Main section format: large, bold, colored with separator line
\\titleformat{\\section}
  {\\color{text}\\fontsize{16pt}{1em}\\bfseries\\scshape}
  {}{0em}{}[\\color{awesome}\\titlerule]
\\titlespacing*{\\section}{0pt}{3mm}{2.5mm}

% Subsection format
\\titleformat{\\subsection}
  {\\color{text}\\fontsize{12pt}{1em}\\bfseries}
  {}{0em}{}
\\titlespacing*{\\subsection}{0pt}{2mm}{1mm}

%-------------------------------------------------------------------------------
% LIST FORMATTING
%-------------------------------------------------------------------------------
\\setlist[itemize]{
    leftmargin=*,
    topsep=0pt,
    itemsep=1pt,
    parsep=0pt,
    label=\\textbullet
}

%-------------------------------------------------------------------------------
% PAGE SETUP
%-------------------------------------------------------------------------------
% Remove page numbers
\\pagenumbering{gobble}

% Paragraph settings
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

%-------------------------------------------------------------------------------
% CUSTOM COMMANDS (mimicking awesome-cv.cls commands)
%-------------------------------------------------------------------------------

% Header name command
\\newcommand{\\headername}[2]{%
  \\fontsize{32pt}{1em}\\selectfont\\color{graytext}#1%
  \\fontsize{32pt}{1em}\\selectfont\\bfseries\\color{text}#2%
}

% Header position/title
\\newcommand{\\headerposition}[1]{%
  \\fontsize{7.6pt}{1em}\\selectfont\\scshape\\color{awesome}#1%
}

% Header contact info
\\newcommand{\\headercontact}[1]{%
  \\fontsize{8pt}{1em}\\selectfont\\color{text}#1%
}

% Header social links
\\newcommand{\\headersocial}[1]{%
  \\fontsize{6.8pt}{1em}\\selectfont\\color{text}#1%
}

% CV Entry (for work experience, education)
\\newcommand{\\cventry}[4]{%
  \\begin{tabularx}{\\textwidth}{@{}l @{\\extracolsep{\\fill}} r@{}}
    \\textbf{\\color{darktext}#1} & \\color{graytext}\\textsl{#3} \\\\
    \\textsc{\\color{graytext}#2} & \\color{awesome}\\textsl{#4} \\\\
  \\end{tabularx}%
  \\vspace{-2mm}
}

% CV Honor/Award entry
\\newcommand{\\cvhonor}[4]{%
  \\begin{tabularx}{\\textwidth}{@{}l @{\\extracolsep{\\fill}} r@{}}
    \\textbf{\\color{darktext}#2} & \\color{graytext}#4 \\\\
    \\color{graytext}#1 & \\color{awesome}\\textsl{#3} \\\\
  \\end{tabularx}%
  \\vspace{1mm}
}

% Skill type/category
\\newcommand{\\skilltypestyle}[1]{%
  \\textbf{\\color{darktext}#1}%
}

% Skill set
\\newcommand{\\skillsetstyle}[1]{%
  \\color{text}#1%
}

% Divider
\\newcommand{\\cvdivider}{%
  \\vspace{2mm}%
}

% Paragraph style (for summary)
\\newcommand{\\cvparagraph}{%
  \\normalfont\\fontsize{9pt}{1.4em}\\selectfont\\color{text}%
}`;
}

/**
 * Generate header section with personal information
 * Mimics Awesome-CV's \\makecvheader command
 */
function generateHeader(basics: ResumeData['basics']): string {
  const lines: string[] = [];

  // Parse name (Awesome-CV uses first/last name)
  const nameParts = basics.name.split(' ');
  const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  // Header layout
  lines.push('% Header');
  lines.push('\\begin{center}');

  // Name
  lines.push(`\\headername{${escapeLaTeX(firstName)}}{${escapeLaTeX(lastName)}}`);
  lines.push('\\\\[0.4mm]');

  // Position/Title
  lines.push(`\\headerposition{${escapeLaTeX(basics.label)}}`);
  lines.push('\\\\[-0.5mm]');

  // Separator
  lines.push('\\vspace{1mm}');

  // Contact information (all on one line, separated by |)
  const contactParts: string[] = [];

  if (basics.location) {
    contactParts.push(`\\faMapMarker\\ ${escapeLaTeX(basics.location)}`);
  }

  if (basics.phone) {
    contactParts.push(`\\faMobile\\ ${escapeLaTeX(basics.phone)}`);
  }

  if (basics.email) {
    contactParts.push(`\\faEnvelope\\ \\href{mailto:${basics.email}}{${basics.email}}`);
  }

  if (contactParts.length > 0) {
    lines.push(`\\headercontact{${contactParts.join(' \\quad\\textbar\\quad ')}}`);
    lines.push('\\\\[0.5mm]');
  }

  // Social profiles (GitHub, LinkedIn, Portfolio)
  const socialParts: string[] = [];

  basics.profiles.forEach((profile) => {
    const label = profile.label || cleanURL(profile.url);

    if (profile.network.toLowerCase() === 'github') {
      socialParts.push(`\\faGithub\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(label)}}`);
    } else if (profile.network.toLowerCase() === 'linkedin') {
      socialParts.push(`\\faLinkedin\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(label)}}`);
    } else {
      socialParts.push(`\\faGlobe\\ \\href{${escapeURL(profile.url)}}{${escapeLaTeX(label)}}`);
    }
  });

  // Note: homepage is not in the ResumeData schema, but can be added if needed

  if (socialParts.length > 0) {
    lines.push(`\\headersocial{${socialParts.join(' \\quad\\textbar\\quad ')}}`);
  }

  lines.push('\\end{center}');
  lines.push('\\vspace{2mm}');

  return lines.join('\n');
}

/**
 * Generate summary section
 * Uses cvparagraph style from Awesome-CV
 */
function generateSummary(summary?: string): string {
  if (!summary) return '';

  return `\\section{Summary}

{\\cvparagraph
${escapeLaTeX(summary)}
}`;
}

/**
 * Generate work experience section
 * Uses cventry command similar to Awesome-CV
 */
function generateExperienceSection(work: ResumeData['work']): string {
  if (!work || work.length === 0) return '';

  const entries = work.map((job) => {
    const dateRange = formatDateRange(job.startDate, job.endDate);

    let content = `\\cventry{${escapeLaTeX(job.position)}}{${escapeLaTeX(job.company)} — ${escapeLaTeX(job.type)}}{${dateRange}}{${escapeLaTeX(job.location)}}`;

    // Add highlights as bullet points
    if (job.highlights && job.highlights.length > 0) {
      content += '\n' + arrayToCompactItemize(job.highlights);
    }

    content += '\n\\cvdivider';

    return content;
  });

  return `\\section{Work Experience}

${entries.join('\n\n')}`;
}

/**
 * Generate projects section
 */
function generateProjectsSection(projects: ResumeData['projects']): string {
  if (!projects || projects.length === 0) return '';

  const entries = projects.map((project) => {
    const projectTitle = `\\textbf{\\color{darktext}${escapeLaTeX(project.name)}}`;
    const projectDesc = `\\textit{\\color{graytext}${escapeLaTeX(project.description)}}`;

    let content = `${projectTitle} — ${projectDesc}`;

    if (project.url) {
      content += ` \\textcolor{awesome}{[\\href{${escapeURL(project.url)}}{Link}]}`;
    }

    // Add highlights
    if (project.highlights && project.highlights.length > 0) {
      content += '\n' + arrayToCompactItemize(project.highlights);
    }

    content += '\n\\cvdivider';

    return content;
  });

  return `\\section{Projects}

${entries.join('\n\n')}`;
}

/**
 * Generate education section
 * Uses cventry command
 */
function generateEducationSection(education: ResumeData['education']): string {
  if (!education || education.length === 0) return '';

  const entries = education.map((edu) => {
    const dateRange = formatDateRange(edu.startDate, edu.endDate);
    const degree = `${edu.studyType} of ${edu.area}`;

    let content = `\\cventry{${escapeLaTeX(degree)}}{${escapeLaTeX(edu.institution)}}{${dateRange}}{${escapeLaTeX(edu.location)}}`;

    // Add note if available
    if (edu.note) {
      content += `\n\\vspace{1mm}\n{\\small\\color{text}${escapeLaTeX(edu.note)}}`;
    }

    content += '\n\\cvdivider';

    return content;
  });

  return `\\section{Education}

${entries.join('\n\n')}`;
}

/**
 * Generate skills section
 * Uses skill type and skill set styles from Awesome-CV
 */
function generateSkillsSection(skills: ResumeData['skills']): string {
  if (!skills || skills.length === 0) return '';

  const entries = skills.map((skill) => {
    const keywords = skill.keywords.join(', ');

    return `\\begin{tabularx}{\\textwidth}{@{} >{\\raggedright\\arraybackslash}p{3.5cm} @{\\hspace{1ex}} X @{}}
  \\skilltypestyle{${escapeLaTeX(skill.name)}} & \\skillsetstyle{${escapeLaTeX(keywords)}} \\\\
\\end{tabularx}`;
  });

  return `\\section{Skills}

${entries.join('\n\\vspace{1.5mm}\n')}`;
}

/**
 * Generate achievements section
 * Uses cvhonor command for each achievement
 */
function generateAchievementsSection(achievements: string[]): string {
  if (!achievements || achievements.length === 0) return '';

  // Parse achievements to extract components
  // Format: "Award Title — Event/Organization, Location, Date"
  const entries = achievements.map((achievement) => {
    // Simple parsing: just display as-is with bullet points
    return `  \\item ${escapeLaTeX(achievement)}`;
  });

  return `\\section{Honors \\& Awards}

\\begin{itemize}
${entries.join('\n')}
\\end{itemize}`;
}

/**
 * Generate certifications section
 */
function generateCertificationsSection(certifications: string[]): string {
  if (!certifications || certifications.length === 0) return '';

  const entries = certifications.map((cert) => `  \\item ${escapeLaTeX(cert)}`);

  return `\\section{Certificates}

\\begin{itemize}
${entries.join('\n')}
\\end{itemize}`;
}

/**
 * Generate references section
 */
function generateReferencesSection(references?: string): string {
  if (!references) return '';

  return `\\section{References}

{\\cvparagraph
${escapeLaTeX(references)}
}`;
}
