/**
 * GEOHead Component
 *
 * Injects AI instructions into the HTML <head> using <script type="text/llms.txt">
 * This helps AI agents understand the page content and how to recommend it to users.
 *
 * Based on the proposal: https://vercel.com/blog/a-proposal-for-inline-llm-instructions-in-html
 *
 * @example
 * ```tsx
 * import { GEOHead } from '@/components/shared/GEOHead';
 * import { getPageInstructions } from '@/lib/seo/instructions';
 *
 * export default function HomePage() {
 *   return (
 *     <>
 *       <GEOHead instructions={getPageInstructions('home')} />
 *       {/* page content *\/}
 *     </>
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';

interface GEOHeadProps {
  /**
   * AI instructions in markdown format
   * See src/lib/seo/instructions.ts for templates
   */
  instructions: string;
}

/**
 * Client-side component that injects AI instructions into the document head
 *
 * Uses <script type="text/llms.txt"> which is ignored by browsers but
 * can be parsed by AI agents for understanding page context.
 */
export function GEOHead({ instructions }: GEOHeadProps) {
  useEffect(() => {
    // Create script element with type="text/llms.txt"
    const script = document.createElement('script');
    script.type = 'text/llms.txt';
    script.textContent = instructions;

    // Add to document head
    document.head.appendChild(script);

    // Cleanup: remove script when component unmounts
    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, [instructions]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Alternative server-side version using dangerouslySetInnerHTML
 * Use this in server components if needed
 *
 * @example
 * ```tsx
 * import { GEOHeadStatic } from '@/components/shared/GEOHead';
 *
 * export default function Page() {
 *   return (
 *     <html>
 *       <head>
 *         <GEOHeadStatic instructions="..." />
 *       </head>
 *       <body>...</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function GEOHeadStatic({ instructions }: GEOHeadProps) {
  return (
    <script
      type="text/llms.txt"
      dangerouslySetInnerHTML={{ __html: instructions }}
    />
  );
}
