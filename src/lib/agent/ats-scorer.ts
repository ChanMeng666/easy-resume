import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";

/**
 * Schema for ATS optimization report.
 */
export const atsReportSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("Overall ATS compatibility score"),
  sections: z.object({
    formatting: z.object({
      score: z.number().min(0).max(100),
      issues: z.array(z.string()),
      suggestions: z.array(z.string()),
    }).describe("Formatting and structure analysis"),
    keywords: z.object({
      score: z.number().min(0).max(100),
      found: z.array(z.string()),
      missing: z.array(z.string()),
      density: z.string().describe("Keyword density assessment"),
    }).describe("Keyword optimization analysis"),
    experience: z.object({
      score: z.number().min(0).max(100),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }).describe("Experience presentation analysis"),
    skills: z.object({
      score: z.number().min(0).max(100),
      wellPresented: z.array(z.string()),
      needsImprovement: z.array(z.string()),
    }).describe("Skills section analysis"),
  }),
  topPriorities: z.array(z.object({
    priority: z.number().min(1).max(5),
    action: z.string(),
    impact: z.string().describe("Expected impact: high, medium, low"),
  })).describe("Top 5 prioritized actions to improve ATS score"),
});

export type ATSReport = z.infer<typeof atsReportSchema>;

/**
 * Scores a resume against ATS best practices and optionally against a specific JD.
 * Provides detailed breakdown with actionable improvement priorities.
 */
export async function scoreATS(
  resume: ResumeData,
  jd?: ParsedJD
): Promise<ATSReport> {
  const jdContext = jd
    ? `\nTARGET JOB:
Title: ${jd.title} at ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}
Keywords: ${jd.keywords.join(", ")}
Requirements: ${jd.requirements.join("; ")}`
    : "\nNo specific job target - evaluate against general ATS best practices.";

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: atsReportSchema,
    prompt: `You are an ATS (Applicant Tracking System) optimization expert.
Analyze this resume for ATS compatibility and provide a detailed report.

RESUME DATA:
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Email: ${resume.basics.email}
Phone: ${resume.basics.phone}
Location: ${resume.basics.location}
Summary: ${resume.basics.summary || "MISSING - Critical for ATS"}

Skills: ${resume.skills.map(s => `${s.name}: ${s.keywords.join(", ")}`).join("\n")}

Work Experience:
${resume.work.map(w => `- ${w.position} at ${w.company} (${w.startDate} - ${w.endDate})
  ${w.highlights.map(h => `  * ${h}`).join("\n")}`).join("\n")}

Education:
${resume.education.map(e => `- ${e.studyType} in ${e.area} from ${e.institution}`).join("\n")}

Projects:
${resume.projects.map(p => `- ${p.name}: ${p.highlights.join("; ")}`).join("\n")}

Achievements: ${resume.achievements.join("; ") || "None listed"}
Certifications: ${resume.certifications.join("; ") || "None listed"}
${jdContext}

Evaluate for:
1. Keyword optimization (are the right terms used?)
2. Experience formatting (action verbs, quantified achievements)
3. Skills presentation (clear, categorized, relevant)
4. Overall structure and completeness
5. Missing sections or weak areas

Provide top 5 prioritized actions sorted by expected impact.`,
  });

  return object;
}
