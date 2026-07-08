'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** One overflow-menu entry. Provide either onClick or href. */
export interface RowActionItem {
  label: string;
  onClick?: () => void;
  href?: string;
  /** Renders in rose-ink after a separator, at the end of the menu. */
  destructive?: boolean;
  disabled?: boolean;
}

interface RowActionsProps {
  /** The 1–2 visible actions (small Buttons). Everything else goes in `more`. */
  children?: ReactNode;
  /** Secondary actions collapsed behind the "More actions" ellipsis menu. */
  more?: RowActionItem[];
  className?: string;
}

/**
 * Standard action row for list cards: at most two visible buttons plus an
 * icon-only overflow menu. Destructive items sit last, separated, in rose-ink.
 * Keeps card rows to a single line instead of a wrapping pile of buttons.
 */
export function RowActions({ children, more, className }: RowActionsProps) {
  const regular = (more ?? []).filter((item) => !item.destructive);
  const destructive = (more ?? []).filter((item) => item.destructive);
  const hasMenu = regular.length > 0 || destructive.length > 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {regular.map((item) => (
              <RowActionMenuItem key={item.label} item={item} />
            ))}
            {regular.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
            {destructive.map((item) => (
              <RowActionMenuItem key={item.label} item={item} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function RowActionMenuItem({ item }: { item: RowActionItem }) {
  const itemClass = item.destructive ? 'text-rose-ink focus:text-rose-ink' : undefined;
  if (item.href && !item.disabled) {
    return (
      <DropdownMenuItem asChild className={itemClass}>
        <Link href={item.href}>{item.label}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem className={itemClass} disabled={item.disabled} onClick={item.onClick}>
      {item.label}
    </DropdownMenuItem>
  );
}
