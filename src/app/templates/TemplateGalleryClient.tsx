/**
 * Template Gallery Client Component
 *
 * Handles client-side GEO features (AI instructions and structured data)
 * for the template gallery page.
 */

'use client';

import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { getTemplateListSchema, getBreadcrumbSchema } from '@/lib/seo/schemas';
import { TemplateMetadata } from '@/templates/types';

interface TemplateGalleryClientProps {
  templateMetadata: TemplateMetadata[];
}

export function TemplateGalleryClient({ templateMetadata }: TemplateGalleryClientProps) {
  // Create breadcrumb navigation
  const breadcrumbs = [
    { name: 'Home', url: 'https://easy-resume-theta.vercel.app/' },
    { name: 'Templates', url: 'https://easy-resume-theta.vercel.app/templates' },
  ];

  return (
    <>
      {/* GEO: AI Agent Instructions */}
      <GEOHead instructions={getPageInstructions('templates')} />

      {/* SEO: Structured Data */}
      <MultipleStructuredData
        schemas={[
          getTemplateListSchema(templateMetadata),
          getBreadcrumbSchema(breadcrumbs),
        ]}
      />
    </>
  );
}
