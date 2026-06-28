import { generateObject } from "ai";
import { ResumeData, resumeDataSchema } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { MatchAnalysis } from "./matching-engine";
import { reasonModel, WRITING_TEMPERATURE } from "./models";
import { aiTelemetry } from "./telemetry";

/**
 * Tailors a resume to a specific job description.
 * Uses the match analysis to intelligently modify resume content for maximum ATS
 * alignment while preserving factual accuracy.
 *
 * @param feedback Optional corrective notes (e.g. faithfulness violations + ATS
 *   priorities) for a second, targeted revision pass. See the pipeline's
 *   critique→revise loop.
 */
export async function tailorResume(
  baseResume: ResumeData,
  jd: ParsedJD,
  matchAnalysis: MatchAnalysis,
  feedback?: string
): Promise<ResumeData> {
  const feedbackBlock = feedback
    ? `\n\nCORRECTION NOTES (a previous draft had these issues — fix them WITHOUT adding any new facts):\n${feedback}`
    : "";

  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: resumeDataSchema,
    temperature: WRITING_TEMPERATURE,
    providerOptions: { openai: { strictJsonSchema: false } },
    experimental_telemetry: aiTelemetry("tailor-resume"),
    prompt: `You are an expert resume writer. Tailor this resume for the target job.

RULES:
1. NEVER fabricate experience, skills, or qualifications the candidate doesn't have. Do NOT add skills to the skills section that don't already appear in the current resume.
2. Rewrite bullet points to emphasize relevant skills and use JD keywords naturally
3. Reorder skills to prioritize those matching the JD
4. Adjust the professional summary to target the specific role
5. Highlight transferable skills from existing experience
6. Use action verbs and quantify achievements where possible — but only with numbers already present in the resume; never invent metrics
7. Incorporate missing keywords ONLY where the candidate's real experience already supports them
8. Keep all dates, companies, institutions, contact details, and factual details unchanged
9. Do NOT add contact details (email, phone, location) that are empty in the current resume

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
Suggestions: ${matchAnalysis.suggestions.join("; ")}${feedbackBlock}

Return the complete tailored resume data. Preserve all structural fields.`,
  });

  return object;
}
