import { Template } from '../types';
import { sidebarAccentMetadata } from './metadata';
import { generateSidebarAccent } from './generator';

const sidebarAccentTemplate: Template = {
  metadata: sidebarAccentMetadata,
  generator: generateSidebarAccent,
};

export default sidebarAccentTemplate;
