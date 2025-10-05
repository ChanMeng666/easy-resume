import { ResumeData } from '@/lib/validation/schema';

/**
 * Section completion status
 */
export interface SectionCompletion {
  id: string;
  name: string;
  completion: number; // 0-100
  status: 'empty' | 'partial' | 'complete';
}

/**
 * Calculate completion percentage for basics section
 */
function calculateBasicsCompletion(basics: ResumeData['basics']): number {
  const requiredFields = ['name', 'label', 'email', 'phone', 'location'];
  const optionalFields = ['summary', 'profiles'];

  let score = 0;
  const total = requiredFields.length * 2 + optionalFields.length; // Required fields worth 2 points

  // Check required fields (2 points each)
  requiredFields.forEach(field => {
    if (basics[field as keyof typeof basics] && String(basics[field as keyof typeof basics]).trim()) {
      score += 2;
    }
  });

  // Check optional fields (1 point each)
  if (basics.summary && basics.summary.trim()) {
    score += 1;
  }
  if (basics.profiles && basics.profiles.length > 0) {
    score += 1;
  }

  return Math.round((score / total) * 100);
}

/**
 * Calculate completion percentage for education section
 */
function calculateEducationCompletion(education: ResumeData['education']): number {
  if (education.length === 0) return 0;

  let totalScore = 0;
  education.forEach(edu => {
    let score = 0;
    const fields = ['institution', 'area', 'studyType', 'startDate', 'endDate', 'location'];

    fields.forEach(field => {
      if (edu[field as keyof typeof edu] && String(edu[field as keyof typeof edu]).trim()) {
        score += 1;
      }
    });

    totalScore += (score / fields.length) * 100;
  });

  return Math.round(totalScore / education.length);
}

/**
 * Calculate completion percentage for work section
 */
function calculateWorkCompletion(work: ResumeData['work']): number {
  if (work.length === 0) return 0;

  let totalScore = 0;
  work.forEach(job => {
    let score = 0;
    const requiredFields = ['company', 'position', 'startDate', 'endDate'];
    const optionalFields = ['location', 'highlights'];
    const total = requiredFields.length * 2 + optionalFields.length;

    requiredFields.forEach(field => {
      if (job[field as keyof typeof job] && String(job[field as keyof typeof job]).trim()) {
        score += 2;
      }
    });

    if (job.location && job.location.trim()) score += 1;
    if (job.highlights && job.highlights.length > 0) score += 1;

    totalScore += (score / total) * 100;
  });

  return Math.round(totalScore / work.length);
}

/**
 * Calculate completion percentage for projects section
 */
function calculateProjectsCompletion(projects: ResumeData['projects']): number {
  if (projects.length === 0) return 0;

  let totalScore = 0;
  projects.forEach(project => {
    let score = 0;
    const fields = ['name', 'description'];
    const total = fields.length * 2 + 2; // name and description required, url and highlights optional

    fields.forEach(field => {
      if (project[field as keyof typeof project] && String(project[field as keyof typeof project]).trim()) {
        score += 2;
      }
    });

    if (project.url && project.url.trim()) score += 1;
    if (project.highlights && project.highlights.length > 0) score += 1;

    totalScore += (score / total) * 100;
  });

  return Math.round(totalScore / projects.length);
}

/**
 * Calculate completion percentage for skills section
 */
function calculateSkillsCompletion(skills: ResumeData['skills']): number {
  if (skills.length === 0) return 0;

  let totalScore = 0;
  skills.forEach(skill => {
    let score = 0;
    if (skill.name && skill.name.trim()) score += 1;
    if (skill.keywords && skill.keywords.length > 0) score += 1;

    totalScore += (score / 2) * 100;
  });

  return Math.round(totalScore / skills.length);
}

/**
 * Calculate completion percentage for simple list sections (achievements, certifications)
 */
function calculateListCompletion(items: string[]): number {
  if (items.length === 0) return 0;
  return 100; // If there's at least one item, consider it complete
}

/**
 * Calculate overall completion for all sections
 */
export function calculateSectionCompletions(data: ResumeData): SectionCompletion[] {
  const sections: SectionCompletion[] = [
    {
      id: 'basics',
      name: 'Personal Information',
      completion: calculateBasicsCompletion(data.basics),
      status: 'empty',
    },
    {
      id: 'education',
      name: 'Education',
      completion: calculateEducationCompletion(data.education),
      status: 'empty',
    },
    {
      id: 'work',
      name: 'Work Experience',
      completion: calculateWorkCompletion(data.work),
      status: 'empty',
    },
    {
      id: 'projects',
      name: 'Projects',
      completion: calculateProjectsCompletion(data.projects),
      status: 'empty',
    },
    {
      id: 'skills',
      name: 'Skills',
      completion: calculateSkillsCompletion(data.skills),
      status: 'empty',
    },
    {
      id: 'achievements',
      name: 'Achievements',
      completion: calculateListCompletion(data.achievements || []),
      status: 'empty',
    },
    {
      id: 'certifications',
      name: 'Certifications',
      completion: calculateListCompletion(data.certifications || []),
      status: 'empty',
    },
  ];

  // Determine status based on completion
  sections.forEach(section => {
    if (section.completion === 0) {
      section.status = 'empty';
    } else if (section.completion < 100) {
      section.status = 'partial';
    } else {
      section.status = 'complete';
    }
  });

  return sections;
}

/**
 * Calculate overall resume completion percentage
 */
export function calculateOverallCompletion(data: ResumeData): number {
  const sections = calculateSectionCompletions(data);
  const totalCompletion = sections.reduce((sum, section) => sum + section.completion, 0);
  return Math.round(totalCompletion / sections.length);
}
