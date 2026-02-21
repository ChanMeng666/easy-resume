import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";

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
 * Performs deterministic skill overlap analysis.
 */
function computeSkillOverlap(resumeSkills: string[], jdSkills: string[]): {
  matched: string[];
  missing: string[];
} {
  const normalizedResume = resumeSkills.map(s => s.toLowerCase().trim());
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jdSkills) {
    const normalizedSkill = skill.toLowerCase().trim();
    if (normalizedResume.some(rs => rs.includes(normalizedSkill) || normalizedSkill.includes(rs))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

/**
 * Analyzes how well a resume matches a job description.
 * Uses hybrid approach: deterministic skill matching + LLM for nuanced analysis.
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
    model: openai("gpt-4o"),
    schema: matchAnalysisSchema,
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
