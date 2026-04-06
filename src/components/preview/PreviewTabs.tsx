'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Info, FileCode, FileText, Zap } from 'lucide-react';
import { LatexPreview } from './LatexPreview';
import { LivePdfPreview } from './LivePdfPreview';
import { getTemplateById } from '@/templates/registry';

interface PreviewTabsProps {
  templateId?: string;
  typstCode: string;
  filename?: string;
}

/**
 * Get PDF preview path based on template ID
 */
function getPdfPath(templateId: string = 'two-column'): string {
  const template = getTemplateById(templateId);
  return template?.metadata.previewImage || `/template/${templateId}-preview.pdf`;
}

/**
 * Neobrutalism styled preview tabs component.
 * Tabbed interface for template preview and Typst code.
 */
export function PreviewTabs({ templateId = 'two-column', typstCode, filename = 'resume' }: PreviewTabsProps) {
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
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="gap-2">
            <Zap className="h-4 w-4" />
            Live PDF
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-2">
            <FileText className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="typst" className="gap-2">
            <FileCode className="h-4 w-4" />
            Typst
          </TabsTrigger>
        </TabsList>

        {/* Live PDF Tab */}
        <TabsContent value="live" className="mt-4">
          <LivePdfPreview typstCode={typstCode} filename={filename} />
        </TabsContent>

        {/* Template Preview Tab */}
        <TabsContent value="template" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">PDF Preview</h3>
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

          <div className="relative w-full overflow-hidden rounded-xl border-2 border-black bg-gray-100">
            <iframe
              key={templateId}
              src={pdfPath}
              className="h-[600px] w-full"
              title="Resume PDF Preview"
            />
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Info className="h-4 w-4 text-white" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-black text-blue-900">Template Style Preview Only</p>
                <p className="text-blue-800 font-medium">
                  This PDF shows the <strong>template design</strong> with sample content.
                  To see your customized resume with your data,
                  use the <strong>Live PDF</strong> tab or download the .typ file.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Typst Code Tab */}
        <TabsContent value="typst" className="mt-4">
          <LatexPreview code={typstCode} filename={filename} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
