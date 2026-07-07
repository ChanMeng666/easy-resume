import { generateObject } from "ai";
import { z } from "zod";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { reasonModel, EXTRACT_TEMPERATURE, reasonSampling } from "./models";
import { computeSkillOverlap } from "./keyword-coverage";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";

/**
 * Schema for match analysis result.
 */
export const matchAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("Overall match score 0-100"),
  skillMatch: z.object({
    matched: z.array(z.string()).describe("Skills from JD found in resume"),
    missing: z.array(z.string()).describe("Required skills missing from resume"),
    additional: z.array(z.string()).describe("Resume skills not in JD but relevant"),
    score: z.number().min(0).max(100),
  }),
  keywordMatch: z.object({
    matched: z.array(z.string()).describe("ATS keywords found in resume"),
    missing: z.array(z.string()).describe("ATS keywords missing from resume"),
    score: z.number().min(0).max(100),
  }),
  experienceAlignment: z.object({
    score: z.number().min(0).max(100),
    feedback: z.string().describe("How well experience aligns with requirements"),
  }),
  suggestions: z.array(z.string()).describe("Specific actionable suggestions to improve match"),
});

export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>;

/**
 * Analyzes how well a resume matches a job description.
 * Uses hybrid approach: deterministic skill matching (computeSkillOverlap) +
 * LLM for nuanced analysis. Runs at extract temperature so the analysis is
 * reproducible for a given resume/JD pair.
 */
export async function analyzeMatch(
  resume: ResumeData,
  jd: ParsedJD
): Promise<MatchAnalysis> {
  // Deterministic pre-analysis
  const resumeSkillsList = resume.skills.flatMap(s => s.keywords);
  const allJdSkills = [...jd.requiredSkills, ...jd.preferredSkills];
  const deterministicOverlap = computeSkillOverlap(resumeSkillsList, allJdSkills);
  // LLM-enhanced analysis
  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: matchAnalysisSchema,
    ...reasonSampling(EXTRACT_TEMPERATURE),
    experimental_telemetry: aiTelemetry("analyze-match", { promptVersion: PROMPT_VERSIONS["analyze-match"] }),
    prompt: `Analyze how well this resume matches the job description.

RESUME:
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Summary: ${resume.basics.summary || "N/A"}
Skills: ${resumeSkillsList.join(", ")}
Work Experience: ${resume.work.map(w => `${w.position} at ${w.company} (${w.startDate}-${w.endDate}): ${w.highlights.join("; ")}`).join("\n")}
Projects: ${resume.projects.map(p => `${p.name}: ${p.highlights.join("; ")}`).join("\n")}

JOB DESCRIPTION:
Title: ${jd.title} at ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}
Preferred Skills: ${jd.preferredSkills.join(", ")}
Keywords: ${jd.keywords.join(", ")}
Requirements: ${jd.requirements.join("; ")}
Responsibilities: ${jd.responsibilities.join("; ")}

DETERMINISTIC PRE-ANALYSIS:
Skills matched: ${deterministicOverlap.matched.join(", ")}
Skills missing: ${deterministicOverlap.missing.join(", ")}

Provide a thorough match analysis with actionable suggestions.`,
  });

  return object;
}
