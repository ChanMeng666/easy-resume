'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { downloadTypFile, copyToClipboard } from '@/lib/typst/compiler';

interface LatexPreviewProps {
  code: string;
  filename?: string;
}

export function LatexPreview({ code, filename = 'resume' }: LatexPreviewProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = () => {
    downloadTypFile(code, filename);
  };

  const handleCopy = async () => {
    await copyToClipboard(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Typst Code</h3>
          <span className="text-xs text-muted-foreground">
            {code.split('\n').length} lines
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download .typ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative">
        <pre className="max-h-[calc(100vh-16rem)] overflow-auto p-4 text-sm font-mono bg-gray-950 text-gray-100" suppressHydrationWarning>
          <code suppressHydrationWarning>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
