'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, CheckCircle } from 'lucide-react';
import { copyToClipboard, downloadTypFile } from '@/lib/typst/compiler';

interface ExportButtonsProps {
  typstCode: string;
  resumeName?: string;
}

export function ExportButtons({ typstCode, resumeName = 'resume' }: ExportButtonsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = async () => {
    try {
      await copyToClipboard(typstCode);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      downloadTypFile(typstCode, resumeName);
    } catch {
      alert('Failed to download file');
    }
  };

  return (
    <div className="sticky top-4 space-y-2">
      <Button
        onClick={handleCopy}
        variant="outline"
        className="w-full"
      >
        {copyStatus === 'copied' ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy Code
          </>
        )}
      </Button>

      <Button
        onClick={handleDownload}
        variant="outline"
        className="w-full"
      >
        <Download className="mr-2 h-4 w-4" />
        Download .typ
      </Button>
    </div>
  );
}
