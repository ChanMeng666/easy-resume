'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Download, CheckCircle } from 'lucide-react';
import { openInOverleaf, copyToClipboard, downloadTexFile } from '@/lib/overleaf/api';

interface ExportButtonsProps {
  latexCode: string;
  resumeName?: string;
}

export function ExportButtons({ latexCode, resumeName = 'resume' }: ExportButtonsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleOpenInOverleaf = () => {
    try {
      openInOverleaf(latexCode, { engine: 'pdflatex' });
    } catch {
      alert('Failed to open in Overleaf. The content might be too large.');
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(latexCode);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      downloadTexFile(latexCode, resumeName);
    } catch {
      alert('Failed to download file');
    }
  };

  return (
    <div className="sticky top-4 space-y-2">
      <Button
        onClick={handleOpenInOverleaf}
        className="w-full"
        size="lg"
        variant="default"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open in Overleaf
      </Button>

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
        Download .tex
      </Button>
    </div>
  );
}
