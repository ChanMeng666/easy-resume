import { Template } from '../types';
import { modernCvMetadata } from './metadata';
import { generateModernCV } from './generator';

/**
 * Modern CV Template
 * Single-column modern resume with clean design
 */
const modernCvTemplate: Template = {
  metadata: modernCvMetadata,
  generator: generateModernCV,
};

export default modernCvTemplate;
