import { Template } from '../types';
import { reverseTwoColumnMetadata } from './metadata';
import { generateReverseTwoColumn } from './generator';

const reverseTwoColumnTemplate: Template = {
  metadata: reverseTwoColumnMetadata,
  generator: generateReverseTwoColumn,
};

export default reverseTwoColumnTemplate;
