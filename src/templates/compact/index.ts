import { Template } from '../types';
import { compactMetadata } from './metadata';
import { generateCompactResume } from './generator';

/**
 * Compact One-Page Template
 * Space-efficient resume for entry-level and student positions
 */
const compactTemplate: Template = {
  metadata: compactMetadata,
  generator: generateCompactResume,
};

export default compactTemplate;
