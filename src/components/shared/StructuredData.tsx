/**
 * StructuredData Component
 *
 * Injects JSON-LD structured data into the HTML <head> for better SEO
 * and AI understanding of page content.
 *
 * JSON-LD (JavaScript Object Notation for Linked Data) helps search engines
 * and AI agents understand the semantic meaning of page content.
 *
 * @example
 * ```tsx
 * import { StructuredData } from '@/components/shared/StructuredData';
 * import { webApplicationSchema } from '@/lib/seo/schemas';
 *
 * export default function HomePage() {
 *   return (
 *     <>
 *       <StructuredData schema={webApplicationSchema} />
 *       {/* page content *\/}
 *     </>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';

interface StructuredDataProps {
  /**
   * JSON-LD schema object
   * See src/lib/seo/schemas.ts for available schemas
   */
  schema: Record<string, unknown>;
}

/**
 * Client-side component that injects JSON-LD structured data into document head
 *
 * Uses <script type="application/ld+json"> which is the standard format
 * for structured data recognized by search engines and AI agents.
 */
export function StructuredData({ schema }: StructuredDataProps) {
  useEffect(() => {
    // Create script element with type="application/ld+json"
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema, null, 2);

    // Add to document head
    document.head.appendChild(script);

    // Cleanup: remove script when component unmounts
    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, [schema]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Alternative server-side version using dangerouslySetInnerHTML
 * Use this in server components if needed
 *
 * @example
 * ```tsx
 * import { StructuredDataStatic } from '@/components/shared/StructuredData';
 *
 * export default function Page() {
 *   return (
 *     <html>
 *       <head>
 *         <StructuredDataStatic schema={yourSchema} />
 *       </head>
 *       <body>...</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function StructuredDataStatic({ schema }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
    />
  );
}

/**
 * Multiple Structured Data Component
 *
 * Allows injecting multiple JSON-LD schemas at once
 *
 * @example
 * ```tsx
 * <MultipleStructuredData schemas={[schema1, schema2, schema3]} />
 * ```
 */
export function MultipleStructuredData({ schemas }: { schemas: Record<string, unknown>[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <StructuredData key={index} schema={schema} />
      ))}
    </>
  );
}
