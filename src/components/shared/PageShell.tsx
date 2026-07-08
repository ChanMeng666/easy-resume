import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  /**
   * Content column width. Every page picks exactly one:
   * - 'content': the standard 1200px column (lists, marketing, editor).
   * - 'narrow': a centered 672px column for focused pages (dashboard, forms).
   */
  width?: 'content' | 'narrow';
  /** Rendered element. Defaults to <main>; pass 'div' when nesting inside one. */
  as?: ElementType;
  className?: string;
}

/**
 * The single page container for every route: clears the floating navbar,
 * applies the standard gutters, and centers the chosen content column.
 * Narrow content is always centered — never left-pinned inside a wide shell.
 */
export function PageShell({
  children,
  width = 'content',
  as: Tag = 'main',
  className,
}: PageShellProps) {
  return (
    <Tag
      className={cn(
        'page-shell page-pad-b mx-auto w-full px-4 sm:px-6',
        width === 'narrow' ? 'max-w-2xl' : 'max-w-content',
        className
      )}
    >
      {children}
    </Tag>
  );
}
