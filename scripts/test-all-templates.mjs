/**
 * Test script to verify all templates are working correctly
 * This script generates LaTeX code for all templates using sample resume data
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import templates
const { getAllTemplates } = await import('../src/templates/registry.ts');

// Load sample resume data
const resumeDataPath = join(__dirname, '../src/data/resume.ts');
const resumeDataContent = readFileSync(resumeDataPath, 'utf-8');

// Extract resume data (simplified - in production would use proper parser)
const { resumeData } = await import('../src/data/resume.ts');

console.log('🧪 Testing all resume templates...\n');

const templates = getAllTemplates();
console.log(`Found ${templates.length} templates:\n`);

let successCount = 0;
let failureCount = 0;

templates.forEach((template, index) => {
  const { id, name, category, tags } = template.metadata;

  console.log(`${index + 1}. Testing: ${name} (${id})`);
  console.log(`   Category: ${category}`);
  console.log(`   Tags: ${tags.join(', ')}`);

  try {
    // Test LaTeX generation
    const latexCode = template.generator(resumeData);

    // Basic validation
    if (!latexCode) {
      throw new Error('Generated LaTeX code is empty');
    }

    if (!latexCode.includes('\\documentclass')) {
      throw new Error('Missing \\documentclass declaration');
    }

    if (!latexCode.includes('\\begin{document}')) {
      throw new Error('Missing \\begin{document}');
    }

    if (!latexCode.includes('\\end{document}')) {
      throw new Error('Missing \\end{document}');
    }

    const lineCount = latexCode.split('\n').length;
    console.log(`   ✅ Success! Generated ${lineCount} lines of LaTeX code\n`);
    successCount++;

  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
    failureCount++;
  }
});

console.log('═'.repeat(60));
console.log(`\n📊 Test Summary:`);
console.log(`   Total templates: ${templates.length}`);
console.log(`   ✅ Passed: ${successCount}`);
console.log(`   ❌ Failed: ${failureCount}`);
console.log(`   Success rate: ${((successCount / templates.length) * 100).toFixed(1)}%\n`);

if (failureCount === 0) {
  console.log('🎉 All templates are working correctly!');
  process.exit(0);
} else {
  console.log('⚠️  Some templates failed. Please check the errors above.');
  process.exit(1);
}
