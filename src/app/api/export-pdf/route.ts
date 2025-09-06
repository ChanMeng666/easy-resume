import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { PDFOptions } from 'puppeteer';

export async function POST(req: NextRequest) {
  console.log('PDF generation started...');
  
  try {
    // Launch browser - Windows optimized configuration
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });
    console.log('Browser launched successfully');

    const page = await browser.newPage();
    console.log('New page created');

    // Get current domain
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    console.log('Target URL:', baseUrl);

    // Navigate to multi-page PDF export page (using A4 layout)
    console.log('Navigating to multi-page PDF export page...');
    await page.goto(`${baseUrl}/multi-page-pdf-export`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    console.log('Multi-page PDF export page loaded successfully');

    // Set PDF page configuration - precise A4 dimensions
    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',    // No extra margins, content has built-in margins
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,  // Use CSS page dimensions
      scale: 1,
      width: '210mm',
      height: '297mm',
    };

    // Generate PDF
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf(pdfOptions);
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

    // Close browser
    console.log('Closing browser...');
    await browser.close();

    // Generate filename (based on current date)
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `Resume-${currentDate}.pdf`;

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'PDF export endpoint. Use POST method to generate PDF.' },
    { status: 200 }
  );
}
