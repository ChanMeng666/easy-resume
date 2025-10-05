// Test script to generate Awesome CV LaTeX code
import { resumeData } from '../src/data/resume.ts';
import { generateAwesomeCV } from '../src/templates/awesome-cv/generator.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate LaTeX code
const latexCode = generateAwesomeCV(resumeData);

// Save to file for inspection
const outputPath = path.join(__dirname, '..', 'test-awesome-cv-output.tex');
fs.writeFileSync(outputPath, latexCode);

console.log('✅ Awesome CV LaTeX code generated successfully!');
console.log(`📄 Output saved to: ${outputPath}`);
console.log(`📏 Total length: ${latexCode.length} characters`);
console.log('\n--- Preview (first 1000 characters) ---');
console.log(latexCode.substring(0, 1000));
console.log('\n...\n');
console.log('--- Preview (last 500 characters) ---');
console.log(latexCode.substring(latexCode.length - 500));
