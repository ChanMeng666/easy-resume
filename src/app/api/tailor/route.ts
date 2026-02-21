import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { resumeService } from "@/lib/services/resumeService";
import { jdService } from "@/lib/services/jdService";
import { tailorService } from "@/lib/services/tailorService";
import { analyzeMatch } from "@/lib/agent/matching-engine";
import { tailorResume } from "@/lib/agent/resume-tailor";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "@/lib/agent/jd-parser";

/** POST /api/tailor - Create a tailored resume from a base resume + JD. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { baseResumeId, jobDescriptionId, templateId } = await request.json();
    if (!baseResumeId || !jobDescriptionId) {
      return NextResponse.json({ error: "baseResumeId and jobDescriptionId are required" }, { status: 400 });
    }

    // Fetch base resume and JD
    const resume = await resumeService.getById(baseResumeId, user.id);
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

    const jd = await jdService.getById(jobDescriptionId);
    if (!jd) return NextResponse.json({ error: "Job description not found" }, { status: 404 });

    const resumeData = resume.data as ResumeData;
    const parsedJD = jd.parsed as ParsedJD;

    // Analyze match
    const matchAnalysis = await analyzeMatch(resumeData, parsedJD);

    // Tailor resume
    const tailoredData = await tailorResume(resumeData, parsedJD, matchAnalysis);

    // Save tailored resume
    const tailored = await tailorService.create({
      userId: user.id,
      baseResumeId,
      jobDescriptionId,
      data: tailoredData,
      templateId: templateId || resume.templateId,
      matchScore: matchAnalysis.overallScore,
      matchAnalysis,
    });

    return NextResponse.json(tailored, { status: 201 });
  } catch (error) {
    console.error("Error tailoring resume:", error);
    return NextResponse.json({ error: "Failed to tailor resume" }, { status: 500 });
  }
}
