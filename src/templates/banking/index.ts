import { Template } from '../types';
import { bankingMetadata } from './metadata';
import { generateBankingResume } from './generator';

/**
 * Banking & Finance Template
 * Conservative professional resume for finance and consulting
 */
const bankingTemplate: Template = {
  metadata: bankingMetadata,
  generator: generateBankingResume,
};

export default bankingTemplate;
