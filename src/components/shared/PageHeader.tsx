import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/shared/FadeIn';

interface PageHeaderProps {
  /** Small uppercase label above the title (e.g. "Account — Credits & Billing"). */
  eyebrow?: string;
  title: string;
  /** One-sentence description under the title. */
  lede?: string;
  /** Optional right-aligned action (a single Button, at most two). */
  actions?: ReactNode;
  className?: string;
}

/**
 * The standard page header for every workspace page: eyebrow, whisper-weight
 * title, and a one-line lede, with an optional action slot that wraps below on
 * small screens. Keeps heading rhythm identical across routes.
 */
export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <FadeIn className={cn('mb-8 md:mb-10', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-2 text-caption uppercase tracking-wider text-fog-deep">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {lede && <p className="mt-2 max-w-xl text-muted-foreground">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </FadeIn>
  );
}
