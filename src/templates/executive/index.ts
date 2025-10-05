import { Template } from '../types';
import { executiveMetadata } from './metadata';
import { generateExecutiveResume } from './generator';

/**
 * Executive Resume Template
 * Professional resume for C-level and senior management positions
 */
const executiveTemplate: Template = {
  metadata: executiveMetadata,
  generator: generateExecutiveResume,
};

export default executiveTemplate;
