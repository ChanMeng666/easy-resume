import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { ResumeData, resumeDataSchema } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { MatchAnalysis } from "./matching-engine";

/**
 * Tailors a resume to a specific job description.
 * Uses the match analysis to intelligently modify resume content for maximum ATS alignment
 * while preserving factual accuracy.
 */
export async function tailorResume(
  baseResume: ResumeData,
  jd: ParsedJD,
  matchAnalysis: MatchAnalysis
): Promise<ResumeData> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: resumeDataSchema,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `You are an expert resume writer. Tailor this resume for the target job.

RULES:
1. NEVER fabricate experience, skills, or qualifications the candidate doesn't have
2. Rewrite bullet points to emphasize relevant skills and use JD keywords naturally
3. Reorder skills to prioritize those matching the JD
4. Adjust the professional summary to target the specific role
5. Highlight transferable skills from existing experience
6. Use action verbs and quantify achievements where possible
7. Incorporate missing keywords where they naturally fit in existing content
8. Keep all dates, companies, institutions, and factual details unchanged

CURRENT RESUME:
${JSON.stringify(baseResume, null, 2)}

TARGET JOB:
Title: ${jd.title} at ${jd.company}
Location: ${jd.location}
Required Skills: ${jd.requiredSkills.join(", ")}
Preferred Skills: ${jd.preferredSkills.join(", ")}
Keywords: ${jd.keywords.join(", ")}
Responsibilities: ${jd.responsibilities.join("; ")}
Requirements: ${jd.requirements.join("; ")}

MATCH ANALYSIS:
Overall Score: ${matchAnalysis.overallScore}/100
Missing Skills: ${matchAnalysis.skillMatch.missing.join(", ")}
Missing Keywords: ${matchAnalysis.keywordMatch.missing.join(", ")}
Suggestions: ${matchAnalysis.suggestions.join("; ")}

Return the complete tailored resume data. Preserve all structural fields.`,
  });

  return object;
}
