import { Template } from '../types';
import { twoColumnMetadata } from './metadata';
import { generateTypstCode } from '@/lib/typst/generator';

/**
 * Two-Column Template
 * Uses the main Typst generator for a 60/40 two-column layout
 */
const twoColumnTemplate: Template = {
  metadata: twoColumnMetadata,
  generator: generateTypstCode,
};

export default twoColumnTemplate;
