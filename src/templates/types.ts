import { ResumeData } from '@/lib/validation/schema';
import type { DesignTokens } from '@/lib/design/tokens';

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
  /**
   * When true this template keeps its own signature color identity and ignores
   * the selected palette (honored in the render path via renderTemplate, not the
   * selector). Set on templates whose brand IS their colors (executive, creative).
   */
  lockPalette?: boolean;
}

/**
 * Template generator function type. `tokens` is optional so every existing
 * call site (and any template that doesn't consume the palette) compiles
 * unchanged; palette-aware generators default it to DEFAULT_TOKENS.
 */
export type TemplateGenerator = (data: ResumeData, tokens?: DesignTokens) => string;

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
