import { Template } from '../types';
import { creativeMetadata } from './metadata';
import { generateCreativePortfolio } from './generator';

/**
 * Creative Portfolio Template
 * Bold sidebar design for designers and creative professionals
 */
const creativeTemplate: Template = {
  metadata: creativeMetadata,
  generator: generateCreativePortfolio,
};

export default creativeTemplate;
