import { Template } from '../types';
import { academicMetadata } from './metadata';
import { generateAcademicCV } from './generator';

/**
 * Academic Research Template
 * Comprehensive CV for researchers and academics
 */
const academicTemplate: Template = {
  metadata: academicMetadata,
  generator: generateAcademicCV,
};

export default academicTemplate;
