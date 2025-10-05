import { Template } from '../types';
import { awesomeCvMetadata } from './metadata';
import { generateAwesomeCV } from './generator';

/**
 * Awesome CV Template
 * Professional single-column resume inspired by posquit0's Awesome-CV
 * Converted to use standard LaTeX packages for Overleaf compatibility
 */
const awesomeCvTemplate: Template = {
  metadata: awesomeCvMetadata,
  generator: generateAwesomeCV,
};

export default awesomeCvTemplate;
