import { Template, TemplateCategory, TemplateRegistry } from './types';
import twoColumnTemplate from './two-column';
import modernCvTemplate from './modern-cv';
import classicTemplate from './classic';
import awesomeCvTemplate from './awesome-cv';
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
    this.register(classicTemplate);
    this.register(awesomeCvTemplate);
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
