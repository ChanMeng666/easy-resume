import { Template } from '../types';
import { twoColumnMetadata } from './metadata';
import { generateLatexCode } from '@/lib/latex/generator';

/**
 * Two-Column Template
 * Uses the existing LaTeX generator
 */
const twoColumnTemplate: Template = {
  metadata: twoColumnMetadata,
  generator: generateLatexCode,
};

export default twoColumnTemplate;
