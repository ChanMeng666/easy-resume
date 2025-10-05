'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Info, FileCode, FileText } from 'lucide-react';
import { LatexPreview } from './LatexPreview';

interface PreviewTabsProps {
  templateId?: string;
  latexCode: string;
}

/**
 * Get PDF preview path based on template ID
 */
function getPdfPath(templateId: string = 'two-column'): string {
  return `/template/${templateId}-preview.pdf`;
}

/**
 * PreviewTabs component
 * Tabbed interface for template preview and LaTeX code
 */
export function PreviewTabs({ templateId = 'two-column', latexCode }: PreviewTabsProps) {
  const pdfPath = getPdfPath(templateId);

  const handleOpenInNewTab = () => {
    window.open(pdfPath, '_blank');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = `${templateId}-preview.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="template" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="template" className="gap-2">
            <FileText className="h-4 w-4" />
            Template Preview
          </TabsTrigger>
          <TabsTrigger value="latex" className="gap-2">
            <FileCode className="h-4 w-4" />
            LaTeX Code
          </TabsTrigger>
        </TabsList>

        {/* Template Preview Tab */}
        <TabsContent value="template" className="space-y-4">
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
                Open
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
              src={pdfPath}
              className="h-[600px] w-full"
              title="Resume PDF Preview"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold">Template Style Preview Only</p>
                <p>
                  This PDF shows the <strong>template design</strong> with sample content.
                  To see your customized resume with your data,
                  click <strong>&quot;Open in Overleaf&quot;</strong> in the top toolbar.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* LaTeX Code Tab */}
        <TabsContent value="latex" className="mt-4">
          <LatexPreview code={latexCode} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
