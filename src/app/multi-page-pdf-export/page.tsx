import { resumeData } from "@/data/resume";
import { A4ResumeLayout } from '@/layouts/A4ResumeLayout';

// Multi-page PDF export page
export default function MultiPagePDFExportPage() {
  return (
    <html lang="en" className="print-mode">
      <head>
        <title>Multi-page Resume PDF Export</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
          
          .pdf-multi-page-container {
            width: 210mm;
            background: white;
          }
          
          .pdf-page {
            width: 210mm;
            height: 297mm;
            background: white;
            page-break-after: always;
            position: relative;
            overflow: hidden;
          }
          
          .pdf-page:last-child {
            page-break-after: auto;
          }
          
          .pdf-content {
            width: calc(210mm - 25.4mm);
            height: calc(297mm - 25.4mm);
            margin: 12.7mm;
            position: relative;
            overflow: hidden;
          }
          
          .pdf-content-inner {
            width: 100%;
          }
          
          /* Copy all A4 layout styles inline */
          .a4-grid {
            display: grid;
            grid-template-columns: 60% 38%;
            grid-gap: 2%;
            height: 100%;
            align-content: start;
          }
          
          .a4-header {
            grid-column: 1 / -1;
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .a4-summary {
            grid-column: 1 / -1;
            font-size: 11pt;
            line-height: 1.4;
            color: #4b5563;
            text-align: justify;
            margin-bottom: 24px;
          }
          
          .a4-name {
            font-size: 18pt;
            font-weight: 700;
            color: #1f2937;
            line-height: 1.2;
            margin: 0 0 8px 0;
            letter-spacing: -0.025em;
          }
          
          .a4-position {
            font-size: 14pt;
            font-weight: 500;
            color: #2563eb;
            line-height: 1.2;
            margin: 0 0 12px 0;
          }
          
          .a4-contact {
            font-size: 10pt;
            color: #6b7280;
            line-height: 1.4;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
          }
          
          .a4-section {
            margin-bottom: 24px;
            break-inside: avoid;
          }
          
          .a4-section-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1f2937;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            margin: 0 0 12px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #2563eb;
            line-height: 1.2;
          }
          
          .a4-item {
            margin-bottom: 16px;
            break-inside: avoid;
          }
          
          .a4-item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            gap: 12px;
          }
          
          .a4-item-title {
            font-weight: 600;
            color: #1f2937;
            font-size: 11pt;
            line-height: 1.2;
            flex: 1;
          }
          
          .a4-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          
          .a4-list-item {
            position: relative;
            padding-left: 12px;
            margin-bottom: 4px;
            font-size: 11pt;
            line-height: 1.4;
            color: #4b5563;
          }
          
          .a4-list-item::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #2563eb;
            font-weight: bold;
          }
          
          .a4-skill-tag {
            font-size: 9pt;
            padding: 2px 6px;
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid #e5e7eb;
            border-radius: 3px;
            line-height: 1.2;
            display: inline-block;
            margin: 0 4px 4px 0;
          }
          
          /* Page number */
          .page-number {
            position: absolute;
            bottom: 8mm;
            right: 8mm;
            font-size: 9pt;
            color: #6b7280;
            font-weight: 500;
          }
        `}} />
      </head>
      <body>
        <div className="pdf-multi-page-container">
          <div className="pdf-page">
            <div className="pdf-content">
              <div className="pdf-content-inner">
                <A4ResumeLayout resumeData={resumeData} />
              </div>
              <div className="page-number">1</div>
            </div>
          </div>
          
          {/* Additional pages will be added by PDF generation logic if needed */}
        </div>
      </body>
    </html>
  );
}
