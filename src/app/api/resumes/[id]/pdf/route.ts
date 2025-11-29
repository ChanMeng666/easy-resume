import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { resumeService } from "@/lib/services/resumeService";
import { blobService } from "@/lib/services/blobService";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/resumes/[id]/pdf - Upload a compiled PDF for a resume.
 * Accepts a PDF file in the request body.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the resume belongs to the user
    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Get the PDF file from the request
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/pdf")) {
      return NextResponse.json(
        { error: "Content-Type must be application/pdf" },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(await request.arrayBuffer());
    if (pdfBuffer.length === 0) {
      return NextResponse.json(
        { error: "Empty PDF file" },
        { status: 400 }
      );
    }

    // Delete existing PDF if present
    if (resume.pdfBlobUrl) {
      await blobService.deletePdf(resume.pdfBlobUrl);
    }

    // Upload the new PDF
    const { url } = await blobService.uploadPdf(id, user.id, pdfBuffer);

    // Update the resume with the new PDF URL
    await resumeService.update(id, user.id, {
      pdfBlobUrl: url,
      pdfUpdatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      pdfUrl: url,
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resumes/[id]/pdf - Get the PDF URL for a resume.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (!resume.pdfBlobUrl) {
      return NextResponse.json(
        { error: "No PDF available for this resume" },
        { status: 404 }
      );
    }

    // Verify the PDF still exists
    const metadata = await blobService.getPdfMetadata(resume.pdfBlobUrl);
    if (!metadata) {
      // PDF was deleted externally, clear the reference
      await resumeService.update(id, user.id, {
        pdfBlobUrl: null,
        pdfUpdatedAt: null,
      });
      return NextResponse.json(
        { error: "PDF no longer available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pdfUrl: resume.pdfBlobUrl,
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
      resumeUpdatedAt: resume.pdfUpdatedAt,
    });
  } catch (error) {
    console.error("Error getting PDF:", error);
    return NextResponse.json(
      { error: "Failed to get PDF" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes/[id]/pdf - Delete the PDF for a resume.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (!resume.pdfBlobUrl) {
      return NextResponse.json({ success: true, message: "No PDF to delete" });
    }

    // Delete from blob storage
    await blobService.deletePdf(resume.pdfBlobUrl);

    // Clear the reference in the database
    await resumeService.update(id, user.id, {
      pdfBlobUrl: null,
      pdfUpdatedAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}
