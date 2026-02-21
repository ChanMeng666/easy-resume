import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { generateCoverLetter } from "@/lib/agent/cover-letter";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "@/lib/agent/jd-parser";

/** POST /api/cover-letter - Generate a cover letter. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resumeData, parsedJD } = await request.json();
    if (!resumeData || !parsedJD) {
      return NextResponse.json({ error: "resumeData and parsedJD are required" }, { status: 400 });
    }

    const coverLetter = await generateCoverLetter(
      resumeData as ResumeData,
      parsedJD as ParsedJD
    );

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}
