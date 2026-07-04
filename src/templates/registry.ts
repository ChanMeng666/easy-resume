import { Template, TemplateCategory, TemplateRegistry } from './types';
import type { ResumeData } from '@/lib/validation/schema';
import { DEFAULT_TOKENS, type DesignTokens } from '@/lib/design/tokens';
import twoColumnTemplate from './two-column';
import modernCvTemplate from './modern-cv';
import executiveTemplate from './executive';
import creativeTemplate from './creative';
import compactTemplate from './compact';
import bankingTemplate from './banking';
import academicTemplate from './academic';

/**
 * Template registry - central place to register all templates
 */
class TemplateRegistryImpl implements TemplateRegistry {
  private templates: Template[] = [];

  constructor() {
    // Register all templates here
    this.register(twoColumnTemplate);
    this.register(modernCvTemplate);
    this.register(executiveTemplate);
    this.register(creativeTemplate);
    this.register(compactTemplate);
    this.register(bankingTemplate);
    this.register(academicTemplate);
  }

  /**
   * Register a new template
   */
  private register(template: Template): void {
    this.templates.push(template);
  }

  /**
   * Get all templates
   */
  getAll(): Template[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  getById(id: string): Template | undefined {
    return this.templates.find((t) => t.metadata.id === id);
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): Template[] {
    return this.templates.filter((t) => t.metadata.category === category);
  }

  /**
   * Get all free templates
   */
  getFree(): Template[] {
    return this.templates.filter((t) => !t.metadata.isPremium);
  }

  /**
   * Get all premium templates
   */
  getPremium(): Template[] {
    return this.templates.filter((t) => t.metadata.isPremium);
  }

  /**
   * Get all available categories
   */
  getCategories(): TemplateCategory[] {
    const categories = new Set(this.templates.map((t) => t.metadata.category));
    return Array.from(categories);
  }
}

// Export singleton instance
export const templateRegistry = new TemplateRegistryImpl();

// Convenience functions for easy access
export const getAllTemplates = () => templateRegistry.getAll();
export const getTemplateById = (id: string) => templateRegistry.getById(id);
export const getTemplatesByCategory = (category: TemplateCategory) =>
  templateRegistry.getByCategory(category);
export const getFreeTemplates = () => templateRegistry.getFree();
export const getPremiumTemplates = () => templateRegistry.getPremium();
export const getTemplateCategories = () => templateRegistry.getCategories();

// Default template
export const DEFAULT_TEMPLATE_ID = 'two-column';
export const getDefaultTemplate = () => templateRegistry.getById(DEFAULT_TEMPLATE_ID);

/**
 * Render a template with design tokens, honoring `lockPalette`.
 *
 * This is the single render seam where the palette decision is applied. The
 * lock is color-identity only: a template that declares `lockPalette` (a
 * signature color identity, e.g. executive/creative) always keeps the default
 * palette so the selected palette can never override its brand colors — but it
 * still honors the selected `density`, so spacing landing applies everywhere.
 * Every other template renders with the given tokens (DEFAULT_TOKENS when none
 * supplied — today's exact look).
 *
 * @param template - The resolved template.
 * @param data - The resume data to render.
 * @param tokens - The selected design tokens (defaults to DEFAULT_TOKENS).
 * @returns The generated Typst source.
 */
export function renderTemplate(
  template: Template,
  data: ResumeData,
  tokens: DesignTokens = DEFAULT_TOKENS
): string {
  const effective: DesignTokens = template.metadata.lockPalette
    ? { palette: DEFAULT_TOKENS.palette, density: tokens.density }
    : tokens;
  return template.generator(data, effective);
}
