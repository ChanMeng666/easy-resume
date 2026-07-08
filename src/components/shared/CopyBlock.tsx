'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CopyBlockProps {
  /** The exact text copied to the clipboard (and rendered, unless children override). */
  code: string;
  /** Optional caption above the block (e.g. "Remote MCP URL"). */
  label?: string;
  className?: string;
}

/**
 * A copyable monospace block: bone panel, 2xl radius, and a text-only
 * Copy/Copied button (no icons — the word is the affordance).
 */
export function CopyBlock({ code, label, className }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the text
      // selectable so the user can copy manually.
    }
  }

  return (
    <div className={className}>
      {label && <p className="mb-2 text-caption text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-2 rounded-2xl border border-ash bg-bone py-2 pl-4 pr-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm text-aubergine">
          {code}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-caption font-medium transition-colors',
            copied ? 'text-mint-ink' : 'text-aubergine hover:bg-ash'
          )}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
