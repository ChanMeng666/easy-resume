import { Template } from '../types';
import { threeSectionMetadata } from './metadata';
import { generateThreeSection } from './generator';

const threeSectionTemplate: Template = {
  metadata: threeSectionMetadata,
  generator: generateThreeSection,
};

export default threeSectionTemplate;
