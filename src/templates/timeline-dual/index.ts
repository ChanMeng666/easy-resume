import { Template } from '../types';
import { timelineDualMetadata } from './metadata';
import { generateTimelineDual } from './generator';

const timelineDualTemplate: Template = {
  metadata: timelineDualMetadata,
  generator: generateTimelineDual,
};

export default timelineDualTemplate;
