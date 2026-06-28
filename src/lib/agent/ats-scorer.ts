import { generateObject } from "ai";
import { z } from "zod";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { extractModel, EXTRACT_TEMPERATURE } from "./models";
import { computeKeywordCoverage, resumeKeywordHaystack } from "./keyword-coverage";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";

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
 *
 * The headline `overallScore` and the keyword section are computed
 * DETERMINISTICALLY (see keyword-coverage.ts) — an LLM numeric score swings
 * run-to-run and isn't independent of the model that wrote the resume. The LLM
 * is used only for the qualitative breakdown (formatting / experience / skills
 * feedback and prioritized actions), at extract temperature for stability.
 */
export async function scoreATS(
  resume: ResumeData,
  jd?: ParsedJD
): Promise<ATSReport> {
  // Deterministic keyword coverage against the JD (the backbone ATS metric).
  const coverage = jd
    ? computeKeywordCoverage(resumeKeywordHaystack(resume), [
        ...jd.keywords,
        ...jd.requiredSkills,
      ])
    : null;

  const jdContext = jd
    ? `\nTARGET JOB:
Title: ${jd.title} at ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}
Keywords: ${jd.keywords.join(", ")}
Requirements: ${jd.requirements.join("; ")}

DETERMINISTIC KEYWORD COVERAGE (already computed — do not re-score this):
Matched: ${coverage!.found.join(", ") || "none"}
Missing: ${coverage!.missing.join(", ") || "none"}
Coverage: ${coverage!.score}/100`
    : "\nNo specific job target - evaluate against general ATS best practices.";

  const { object } = await generateObject({
    model: extractModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: atsReportSchema,
    temperature: EXTRACT_TEMPERATURE,
    experimental_telemetry: aiTelemetry("score-ats", { promptVersion: PROMPT_VERSIONS["score-ats"] }),
    prompt: `You are an ATS (Applicant Tracking System) optimization expert.
Analyze this resume for ATS compatibility and provide a detailed report.

RESUME DATA:
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Email: ${resume.basics.email || "Not provided"}
Phone: ${resume.basics.phone || "Not provided"}
Location: ${resume.basics.location || "Not provided"}
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

Evaluate the QUALITATIVE aspects (the keyword coverage number above is already
final — focus your feedback elsewhere):
1. Experience formatting (action verbs, quantified achievements)
2. Skills presentation (clear, categorized, relevant)
3. Overall structure and completeness
4. Missing sections or weak areas

Provide top 5 prioritized actions sorted by expected impact.`,
  });

  // Override the headline score + keyword section with the deterministic values
  // so the number a user sees is stable and explainable.
  if (coverage) {
    return {
      ...object,
      overallScore: coverage.score,
      sections: {
        ...object.sections,
        keywords: {
          ...object.sections.keywords,
          found: coverage.found,
          missing: coverage.missing,
          score: coverage.score,
        },
      },
    };
  }

  return object;
}
