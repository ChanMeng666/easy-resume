import { ResumeData } from '@/lib/validation/schema';

/**
 * Template category types
 */
export type TemplateCategory = 'tech' | 'academic' | 'business' | 'creative';

/**
 * Template metadata interface
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  isPremium: boolean;
  previewImage: string;
  author?: string;
  createdAt?: string;
}

/**
 * Template generator function type
 */
export type TemplateGenerator = (data: ResumeData) => string;

/**
 * Complete template interface
 */
export interface Template {
  metadata: TemplateMetadata;
  generator: TemplateGenerator;
}

/**
 * Template registry interface
 */
export interface TemplateRegistry {
  getAll(): Template[];
  getById(id: string): Template | undefined;
  getByCategory(category: TemplateCategory): Template[];
  getFree(): Template[];
  getPremium(): Template[];
  getCategories(): TemplateCategory[];
}
