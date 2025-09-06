import { A4_CONFIG, a4Utils } from '@/config/a4-settings';
import { ResumeData } from '@/data/resume';

// Content validation result interface
export interface ContentValidationResult {
  isValid: boolean;
  pageCount: number;
  contentHeight: number;
  warnings: string[];
  suggestions: string[];
}

// Field length limit configuration
export const CONTENT_LIMITS = {
  name: 50,
  position: 100,
  summary: 500,
  company: 80,
  jobTitle: 100,
  jobHighlight: 200,
  projectName: 80,
  projectDescription: 150,
  projectHighlight: 200,
  skill: 30,
  achievement: 150,
  certification: 100,
} as const;

// Function to estimate text rendering height
export function estimateTextHeight(text: string, fontSize: number, lineHeight: number, width: number): number {
  const avgCharWidth = fontSize * 0.6; // Average character width estimation
  const charsPerLine = Math.floor(width / avgCharWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * fontSize * lineHeight;
}

// Validate resume content fits A4 pages
export function validateResumeContent(resumeData: ResumeData): ContentValidationResult {
  let estimatedHeight = 0;
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Header height estimation
  estimatedHeight += A4_CONFIG.layout.header.height;

  // Summary height estimation
  if (resumeData.basics.summary) {
    const summaryHeight = estimateTextHeight(
      resumeData.basics.summary,
      A4_CONFIG.fontSize.body,
      A4_CONFIG.lineHeight.normal,
      A4_CONFIG.content.width
    );
    estimatedHeight += summaryHeight + A4_CONFIG.spacing.section;

    if (resumeData.basics.summary.length > CONTENT_LIMITS.summary) {
      warnings.push(`Summary too long (${resumeData.basics.summary.length}/${CONTENT_LIMITS.summary} characters)`);
      suggestions.push('Consider shortening the summary to highlight core strengths');
    }
  }

  // Left column content height estimation (60% width)
  const leftColumnWidth = A4_CONFIG.content.width * 0.6;
  let leftColumnHeight = 0;

  // Work experience
  if (resumeData.work?.length > 0) {
    leftColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    
    resumeData.work.forEach((job) => {
      // Title and meta information
      leftColumnHeight += A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal * 3;
      
      // Work highlights
      if (job.highlights?.length > 0) {
        job.highlights.forEach((highlight: string) => {
          leftColumnHeight += estimateTextHeight(
            highlight,
            A4_CONFIG.fontSize.body,
            A4_CONFIG.lineHeight.normal,
            leftColumnWidth - 20 // Subtract indentation
          );
        });
      }
      
      leftColumnHeight += A4_CONFIG.spacing.item;

      // Check work experience items
      if (job.highlights?.length > 5) {
        warnings.push(`Work experience "${job.company}" has too many highlights (${job.highlights.length} items)`);
        suggestions.push('Recommend no more than 5 key highlights per work experience');
      }
    });

    if (resumeData.work.length > 4) {
      warnings.push(`Too many work experience entries (${resumeData.work.length} items)`);
      suggestions.push('Recommend showing only the most recent 4 relevant work experiences');
    }
  }

  // Project experience
  if (resumeData.projects?.length > 0) {
    leftColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    
    resumeData.projects.forEach((project) => {
      leftColumnHeight += A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal * 2;
      leftColumnHeight += estimateTextHeight(
        project.description,
        A4_CONFIG.fontSize.body,
        A4_CONFIG.lineHeight.normal,
        leftColumnWidth
      );

      if (project.highlights?.length > 0) {
        project.highlights.forEach((highlight: string) => {
          leftColumnHeight += estimateTextHeight(
            highlight,
            A4_CONFIG.fontSize.body,
            A4_CONFIG.lineHeight.normal,
            leftColumnWidth - 20
          );
        });
      }
      
      leftColumnHeight += A4_CONFIG.spacing.item;
    });

    if (resumeData.projects.length > 3) {
      warnings.push(`Too many projects (${resumeData.projects.length} items)`);
      suggestions.push('Recommend showing only 3 most representative projects');
    }
  }

  // Right column content height estimation (38% width)
  const rightColumnWidth = A4_CONFIG.content.width * 0.38;
  let rightColumnHeight = 0;

  // Education
  if (resumeData.education?.length > 0) {
    rightColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    rightColumnHeight += resumeData.education.length * (A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal * 4 + A4_CONFIG.spacing.item);
    
    if (resumeData.education.length > 3) {
      warnings.push(`Too many education entries (${resumeData.education.length} items)`);
      suggestions.push('Recommend showing only relevant education background');
    }
  }

  // Skills
  if (resumeData.skills?.length > 0) {
    rightColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    
    resumeData.skills.forEach((skillGroup) => {
      rightColumnHeight += A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal;
      const skillsPerRow = Math.floor(rightColumnWidth / 80); // Estimate skills per row
      const skillRows = Math.ceil(skillGroup.keywords.length / skillsPerRow);
      rightColumnHeight += skillRows * 25; // Skill tag height
      rightColumnHeight += A4_CONFIG.spacing.item;
    });

    if (resumeData.skills.length > 6) {
      warnings.push(`Too many skill categories (${resumeData.skills.length} categories)`);
      suggestions.push('Recommend consolidating skills into 5-6 main categories');
    }
  }

  // Achievements and certifications
  if (resumeData.achievements?.length > 0) {
    rightColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    rightColumnHeight += resumeData.achievements.length * (A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal + A4_CONFIG.spacing.item);
    
    if (resumeData.achievements.length > 8) {
      warnings.push(`Too many achievements (${resumeData.achievements.length} items)`);
      suggestions.push('Recommend showing only the most important achievements, max 8 items');
    }
  }

  if (resumeData.certifications?.length > 0) {
    rightColumnHeight += A4_CONFIG.fontSize.sectionTitle + A4_CONFIG.spacing.subsection;
    rightColumnHeight += resumeData.certifications.length * (A4_CONFIG.fontSize.body * A4_CONFIG.lineHeight.normal + A4_CONFIG.spacing.item);
    
    if (resumeData.certifications.length > 10) {
      warnings.push(`Too many certifications (${resumeData.certifications.length} items)`);
      suggestions.push('Recommend showing only relevant professional certifications, max 10 items');
    }
  }

  // Calculate total height (take maximum of left/right columns)
  const mainContentHeight = Math.max(leftColumnHeight, rightColumnHeight);
  estimatedHeight += mainContentHeight;

  // Validation result
  const pageCount = a4Utils.calculatePages(estimatedHeight);
  const isValid = a4Utils.fitsInA4(estimatedHeight);

  // Generate suggestions
  if (pageCount > 1) {
    suggestions.push('Content may require multiple pages, consider condensing for single-page display');
  }

  if (!isValid && suggestions.length === 0) {
    suggestions.push('Content is too long, consider removing non-essential information or adjusting font sizes');
  }

  return {
    isValid,
    pageCount,
    contentHeight: estimatedHeight,
    warnings,
    suggestions,
  };
}

// Generate content optimization tips
export function generateOptimizationTips(validationResult: ContentValidationResult): string[] {
  const tips: string[] = [];

  if (validationResult.pageCount > 1) {
    tips.push('📄 Content will be displayed across multiple pages, consider condensing for single page');
  }

  if (validationResult.warnings.length > 0) {
    tips.push('⚠️ Content length warnings detected, review detailed suggestions');
  }

  if (validationResult.contentHeight > A4_CONFIG.content.height * 0.9) {
    tips.push('📏 Content approaching page bottom, mind print margins');
  }

  if (validationResult.isValid) {
    tips.push('✅ Content length is appropriate for PDF export');
  }

  return tips;
}
