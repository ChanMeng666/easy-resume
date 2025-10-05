import { Template } from '../types';
import { cardGridMetadata } from './metadata';
import { generateCardGrid } from './generator';

const cardGridTemplate: Template = {
  metadata: cardGridMetadata,
  generator: generateCardGrid,
};

export default cardGridTemplate;
