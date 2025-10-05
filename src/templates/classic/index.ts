import { Template } from '../types';
import { classicMetadata } from './metadata';
import { generateClassicCV } from './generator';

/**
 * Classic Academic Template
 * Traditional academic CV style
 */
const classicTemplate: Template = {
  metadata: classicMetadata,
  generator: generateClassicCV,
};

export default classicTemplate;
