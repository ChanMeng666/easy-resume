import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { scoreATS } from "@/lib/agent/ats-scorer";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "@/lib/agent/jd-parser";

/** POST /api/ats - Score a resume for ATS compatibility. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resumeData, parsedJD } = await request.json();
    if (!resumeData) return NextResponse.json({ error: "resumeData is required" }, { status: 400 });

    const report = await scoreATS(
      resumeData as ResumeData,
      parsedJD as ParsedJD | undefined
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error scoring ATS:", error);
    return NextResponse.json({ error: "Failed to score ATS compatibility" }, { status: 500 });
  }
}
