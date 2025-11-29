import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { resumeService } from "@/lib/services/resumeService";
import { resumeDataSchema } from "@/lib/validation/schema";

/**
 * GET /api/resumes - Get all resumes for the current user.
 */
export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await resumeService.getAll(user.id);
    return NextResponse.json(resumes);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resumes - Create a new resume.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, templateId, data } = body;

    // Validate resume data
    const validationResult = resumeDataSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid resume data", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const resume = await resumeService.create({
      userId: user.id,
      title: title || "My Resume",
      templateId: templateId || "two-column",
      data: validationResult.data,
    });

    return NextResponse.json(resume, { status: 201 });
  } catch (error) {
    console.error("Error creating resume:", error);
    return NextResponse.json(
      { error: "Failed to create resume" },
      { status: 500 }
    );
  }
}
