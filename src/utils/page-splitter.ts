import { A4_CONFIG } from '@/config/a4-settings';
import { ResumeData } from '@/data/resume';

// Interface for page content distribution
export interface PageContent {
  pageNumber: number;
  sections: {
    type: 'header' | 'summary' | 'work' | 'projects' | 'education' | 'skills' | 'achievements' | 'certifications';
    content: any;
    startIndex?: number;
    endIndex?: number;
  }[];
}

// Estimate height of different content types
export const HEIGHT_ESTIMATES = {
  header: 120,
  summary: (content: string) => Math.ceil(content.length / 120) * 18 + 24, // ~120 chars per line
  sectionTitle: 36,
  workItem: 80,
  projectItem: 70,
  educationItem: 60,
  skillGroup: 45,
  achievementItem: 20,
  certificationItem: 18,
  pageMargin: 48,
} as const;

export function splitContentIntoPages(resumeData: ResumeData): PageContent[] {
  const pages: PageContent[] = [];
  let currentPage: PageContent = { pageNumber: 1, sections: [] };
  let currentHeight = 0;
  const maxHeight = A4_CONFIG.content.height;

  // Helper function to add section to current page or create new page
  const addSection = (sectionType: PageContent['sections'][0]['type'], content: any, height: number, extraData?: any) => {
    if (currentHeight + height > maxHeight && currentPage.sections.length > 0) {
      // Start new page
      pages.push(currentPage);
      currentPage = { 
        pageNumber: pages.length + 1, 
        sections: [] 
      };
      currentHeight = 0;
    }
    
    currentPage.sections.push({
      type: sectionType,
      content,
      ...extraData
    });
    currentHeight += height;
  };

  // Add header (only on first page)
  addSection('header', resumeData.basics, HEIGHT_ESTIMATES.header);

  // Add summary (only on first page)
  if (resumeData.basics.summary) {
    const summaryHeight = HEIGHT_ESTIMATES.summary(resumeData.basics.summary);
    addSection('summary', resumeData.basics.summary, summaryHeight);
  }

  // Determine layout strategy based on content
  const leftColumnSections = ['work', 'projects'] as const;
  const rightColumnSections = ['education', 'skills', 'achievements', 'certifications'] as const;

  // Process left column content (work, projects)
  if (resumeData.work && resumeData.work.length > 0) {
    // Add work section title
    addSection('work', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    // Add work items, potentially splitting across pages
    let workBatch: any[] = [];
    let batchHeight = 0;
    
    resumeData.work.forEach((workItem, index) => {
      const itemHeight = HEIGHT_ESTIMATES.workItem + (workItem.highlights?.length || 0) * 18;
      
      if (batchHeight + itemHeight > maxHeight - currentHeight && workBatch.length > 0) {
        // Add current batch and start new page
        addSection('work', workBatch, batchHeight);
        workBatch = [workItem];
        batchHeight = itemHeight;
      } else {
        workBatch.push(workItem);
        batchHeight += itemHeight;
      }
      
      // If this is the last item, add the batch
      if (index === resumeData.work.length - 1) {
        addSection('work', workBatch, batchHeight);
      }
    });
  }

  // Process projects
  if (resumeData.projects && resumeData.projects.length > 0) {
    addSection('projects', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    let projectBatch: any[] = [];
    let batchHeight = 0;
    
    resumeData.projects.forEach((project, index) => {
      const itemHeight = HEIGHT_ESTIMATES.projectItem + (project.highlights?.length || 0) * 18;
      
      if (batchHeight + itemHeight > maxHeight - currentHeight && projectBatch.length > 0) {
        addSection('projects', projectBatch, batchHeight);
        projectBatch = [project];
        batchHeight = itemHeight;
      } else {
        projectBatch.push(project);
        batchHeight += itemHeight;
      }
      
      if (index === resumeData.projects.length - 1) {
        addSection('projects', projectBatch, batchHeight);
      }
    });
  }

  // Process right column content (education, skills, achievements, certifications)
  if (resumeData.education && resumeData.education.length > 0) {
    addSection('education', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    const educationHeight = resumeData.education.length * HEIGHT_ESTIMATES.educationItem;
    addSection('education', resumeData.education, educationHeight);
  }

  if (resumeData.skills && resumeData.skills.length > 0) {
    addSection('skills', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    const skillsHeight = resumeData.skills.length * HEIGHT_ESTIMATES.skillGroup;
    addSection('skills', resumeData.skills, skillsHeight);
  }

  if (resumeData.achievements && resumeData.achievements.length > 0) {
    addSection('achievements', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    const achievementsHeight = resumeData.achievements.length * HEIGHT_ESTIMATES.achievementItem;
    addSection('achievements', resumeData.achievements, achievementsHeight);
  }

  if (resumeData.certifications && resumeData.certifications.length > 0) {
    addSection('certifications', { title: true }, HEIGHT_ESTIMATES.sectionTitle);
    
    const certificationsHeight = resumeData.certifications.length * HEIGHT_ESTIMATES.certificationItem;
    addSection('certifications', resumeData.certifications, certificationsHeight);
  }

  // Add the last page if it has content
  if (currentPage.sections.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, sections: [] }];
}

// Optimize page breaks to avoid orphaned content
export function optimizePageBreaks(pages: PageContent[]): PageContent[] {
  return pages.map(page => {
    // Ensure each page has substantial content
    const contentSections = page.sections.filter(s => s.type !== 'header');
    
    if (contentSections.length === 1 && page.pageNumber > 1) {
      const section = contentSections[0];
      if (section.type === 'work' || section.type === 'projects') {
        // If a page only has one work/project item, try to move it to previous page
        // This would require more complex logic to redistribute content
      }
    }
    
    return page;
  });
}
