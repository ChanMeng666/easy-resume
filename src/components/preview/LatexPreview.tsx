'use client';

import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-latex';
import 'prismjs/themes/prism-tomorrow.css';

interface LatexPreviewProps {
  code: string;
}

export function LatexPreview({ code }: LatexPreviewProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-semibold">LaTeX Code</h3>
        <span className="text-xs text-muted-foreground">
          {code.split('\n').length} lines
        </span>
      </div>

      <div className="relative">
        <pre className="max-h-[calc(100vh-16rem)] overflow-auto p-4 text-sm" suppressHydrationWarning>
          <code ref={codeRef} className="language-latex" suppressHydrationWarning>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
