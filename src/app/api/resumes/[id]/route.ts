import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { resumeService } from "@/lib/services/resumeService";
import { resumeDataSchema } from "@/lib/validation/schema";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/resumes/[id] - Get a single resume by ID.
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

    return NextResponse.json(resume);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/resumes/[id] - Update an existing resume.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, templateId, data } = body;

    // Validate resume data if provided
    if (data) {
      const validationResult = resumeDataSchema.safeParse(data);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid resume data", details: validationResult.error.issues },
          { status: 400 }
        );
      }
    }

    const resume = await resumeService.update(id, user.id, {
      ...(title && { title }),
      ...(templateId && { templateId }),
      ...(data && { data }),
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error("Error updating resume:", error);
    return NextResponse.json(
      { error: "Failed to update resume" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes/[id] - Delete a resume.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await resumeService.delete(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
