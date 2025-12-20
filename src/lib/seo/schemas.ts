/**
 * JSON-LD Structured Data Schemas
 *
 * These schemas provide structured data for search engines and AI agents
 * to better understand the content and purpose of each page.
 */

import { TemplateMetadata } from '@/templates/types';

/**
 * Base Organization schema for Vitex
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vitex',
  description: 'Your Career, Perfectly Composed - Professional LaTeX Resume Generator',
  url: 'https://easy-resume-theta.vercel.app/',
  logo: 'https://easy-resume-theta.vercel.app/logo/vitex-logo-white-with-bg.svg',
  sameAs: [
    'https://github.com/ChanMeng666/easy-resume',
  ],
};

/**
 * WebApplication schema for the main application
 */
export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Vitex - Professional LaTeX Resume Generator',
  description: 'Free, privacy-focused web application that generates professional LaTeX resumes through an intuitive visual editor. Create beautiful resumes without LaTeX knowledge, export to Overleaf for instant PDF compilation.',
  url: 'https://easy-resume-theta.vercel.app/',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Visual Resume Editor',
    'Real-time LaTeX Code Generation',
    'Multiple Professional Templates',
    'One-click Overleaf Export',
    'Local Data Storage',
    'No Registration Required',
    'Privacy-Focused',
    'Open Source',
  ],
  screenshot: 'https://easy-resume-theta.vercel.app/screenshots/屏幕截图 2025-09-07 155124.png',
  author: organizationSchema,
  browserRequirements: 'Requires JavaScript. Modern browser recommended.',
};

/**
 * SoftwareApplication schema with technical details
 */
export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vitex',
  applicationCategory: 'WebApplication',
  applicationSubCategory: 'Resume Builder',
  operatingSystem: 'Any (Web-based)',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '1',
  },
  softwareVersion: '1.0',
  softwareRequirements: 'Modern web browser with JavaScript enabled',
  license: 'https://opensource.org/licenses/MIT',
  programmingLanguage: ['TypeScript', 'JavaScript'],
  codeRepository: 'https://github.com/ChanMeng666/easy-resume',
};

/**
 * HowTo schema for resume creation process
 */
export const howToCreateResumeSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Create a Professional LaTeX Resume with Vitex',
  description: 'Step-by-step guide to creating a professional LaTeX resume using Vitex\'s visual editor',
  image: 'https://easy-resume-theta.vercel.app/screenshots/屏幕截图 2025-09-07 155124.png',
  totalTime: 'PT3M',
  estimatedCost: {
    '@type': 'MonetaryAmount',
    currency: 'USD',
    value: '0',
  },
  tool: [
    {
      '@type': 'HowToTool',
      name: 'Web Browser',
    },
    {
      '@type': 'HowToTool',
      name: 'Overleaf Account (optional)',
    },
  ],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Choose a Template',
      text: 'Browse the template gallery and select a professional template that matches your industry and style preferences.',
      url: 'https://easy-resume-theta.vercel.app/templates',
      image: 'https://easy-resume-theta.vercel.app/screenshots/屏幕截图 2025-09-07 155124.png',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Fill in Personal Information',
      text: 'Enter your name, professional title, contact details, and social media profiles using the visual form editor.',
      url: 'https://easy-resume-theta.vercel.app/editor',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Add Education',
      text: 'Add your educational background including schools, degrees, GPA, and any honors or achievements.',
      url: 'https://easy-resume-theta.vercel.app/editor',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Add Work Experience',
      text: 'List your work history with company names, positions, dates, and key achievements for each role.',
      url: 'https://easy-resume-theta.vercel.app/editor',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Add Projects and Skills',
      text: 'Showcase your projects with URLs and descriptions, and categorize your technical and professional skills.',
      url: 'https://easy-resume-theta.vercel.app/editor',
    },
    {
      '@type': 'HowToStep',
      position: 6,
      name: 'Export to PDF',
      text: 'Click "Open in Overleaf" for instant PDF compilation, or download the .tex file for local compilation.',
      url: 'https://easy-resume-theta.vercel.app/editor',
    },
  ],
};

/**
 * Template ItemList schema
 */
export function getTemplateListSchema(templates: TemplateMetadata[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Professional LaTeX Resume Templates',
    description: 'Collection of free professional resume templates for various industries',
    numberOfItems: templates.length,
    itemListElement: templates.map((template, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'CreativeWork',
        name: template.name,
        description: template.description,
        category: template.category,
        keywords: template.tags.join(', '),
        isAccessibleForFree: !template.isPremium,
        image: template.previewImage,
      },
    })),
  };
}

/**
 * FAQ schema (if needed)
 */
export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do I need to know LaTeX to use Vitex?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No, you don\'t need any LaTeX knowledge! Vitex provides a visual form-based editor that automatically generates LaTeX code for you. Simply fill in your information using intuitive forms, and the application handles all the LaTeX formatting.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Vitex really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Vitex is completely free and open source under the MIT license. There are no hidden costs, premium features, or subscription fees. All templates and features are available to everyone at no cost.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my resume data stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'All your resume data is stored locally in your browser\'s localStorage. No data is uploaded to any server, ensuring complete privacy and security. You can export your data as JSON for backup purposes.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I get a PDF of my resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'There are three ways to get a PDF: 1) Click "Open in Overleaf" for instant online PDF compilation (recommended, requires free Overleaf account), 2) Download the .tex file and compile it locally with LaTeX, or 3) Copy the LaTeX code and compile it in your preferred LaTeX editor.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I edit the LaTeX code directly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! After generating the LaTeX code, you can export it to Overleaf or download the .tex file. This gives you full control to manually edit the LaTeX code and customize it further according to your needs.',
      },
    },
    {
      '@type': 'Question',
      name: 'What templates are available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Vitex offers multiple professional templates including Two-Column, Modern CV, Classic Academic, Awesome CV, and more. Templates are categorized by industry: Tech, Academic, Business, and Creative. All templates are free and continuously updated.',
      },
    },
  ],
};

/**
 * BreadcrumbList schema for navigation
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
