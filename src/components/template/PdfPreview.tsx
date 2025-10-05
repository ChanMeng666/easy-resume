'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Info } from 'lucide-react';

const PDF_PATH = '/template/resume-preview.pdf';

export function PdfPreview() {
  const handleOpenInNewTab = () => {
    window.open(PDF_PATH, '_blank');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = PDF_PATH;
    link.download = 'resume-preview.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">PDF Preview</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="relative w-full overflow-hidden rounded-lg border bg-gray-100">
          <iframe
            src={PDF_PATH}
            className="h-[600px] w-full"
            title="Resume PDF Preview"
          />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold">Style Preview Only</p>
              <p>
                This PDF shows the <strong>template style</strong> only and does not reflect your current data.
                After editing your resume content in the <strong>&quot;Edit Resume&quot;</strong> section,
                click the <strong>&quot;Open in Overleaf&quot;</strong> button below to see your customized resume.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
