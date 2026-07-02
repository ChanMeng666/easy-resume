import { generateObject } from "ai";
import { z } from "zod";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { reasonModel, WRITING_TEMPERATURE } from "./models";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";

/**
 * Structured cover-letter output. Generating discrete parts (instead of one free
 * blob) lets us enforce a clean business-letter shape and reject the classic
 * failure modes — unfilled "[Hiring Manager]" / "[Company]" placeholders and
 * runaway length — before the text ever reaches the Typst layer.
 */
export const coverLetterSchema = z.object({
  greeting: z.string().describe('Salutation, e.g. "Dear Hiring Manager,"'),
  paragraphs: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("Body paragraphs, 2-4 of them"),
  closing: z.string().describe('Sign-off line, e.g. "Sincerely,"'),
  signature: z.string().describe("The candidate's full name"),
});

/** Strip any unfilled bracket placeholders like [Company] or [Hiring Manager]. */
export function stripPlaceholders(s: string): string {
  return s.replace(/\[[^\]]*\]/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Generates a professional cover letter tailored to a specific job description.
 *
 * Authenticity + safety: the prompt forbids inventing achievements and forbids
 * bracket placeholders; any that slip through are stripped in code, and the
 * greeting falls back to a generic salutation when no recipient is known. The
 * assembled plain-text body is what the rest of the pipeline consumes.
 */
export async function generateCoverLetter(
  resume: ResumeData,
  jd: ParsedJD
): Promise<string> {
  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: coverLetterSchema,
    temperature: WRITING_TEMPERATURE,
    providerOptions: { openai: { strictJsonSchema: false } },
    experimental_telemetry: aiTelemetry("cover-letter", { promptVersion: PROMPT_VERSIONS["cover-letter"] }),
    prompt: `Write a professional cover letter for this candidate applying to the specified job.

CANDIDATE:
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Summary: ${resume.basics.summary || ""}

Key Experience:
${resume.work.slice(0, 3).map(w =>
  `- ${w.position} at ${w.company} (${w.startDate} - ${w.endDate}): ${w.highlights.slice(0, 3).join("; ")}`
).join("\n")}

Key Skills: ${resume.skills.flatMap(s => s.keywords).slice(0, 20).join(", ")}

Notable Projects:
${resume.projects.slice(0, 2).map(p => `- ${p.name}: ${p.highlights.slice(0, 2).join("; ")}`).join("\n")}

Achievements: ${resume.achievements.slice(0, 3).join("; ") || "N/A"}

TARGET JOB:
Title: ${jd.title}
Company: ${jd.company}
Location: ${jd.location}
Key Requirements: ${jd.requirements.slice(0, 5).join("; ")}
Key Responsibilities: ${jd.responsibilities.slice(0, 5).join("; ")}
Required Skills: ${jd.requiredSkills.join(", ")}

HARD RULES:
1. NEVER output bracket placeholders such as "[Company]", "[Hiring Manager]", or "[Position]". Use the real company/role names above. If the hiring manager's name is unknown, the greeting MUST be exactly "Dear Hiring Manager,".
2. Only reference achievements, skills, and experience that appear in the candidate data above. Do NOT invent metrics, employers, or accomplishments.
3. Use the signature field for the candidate's real name ("${resume.basics.name}").

STYLE GUIDELINES:
1. Professional but engaging tone; 2-4 body paragraphs.
2. Opening paragraph: something specific about the role/company + genuine enthusiasm. Do NOT open with "I am writing to express my interest".
3. Middle: connect 2-3 concrete experiences/skills to the job's requirements, using real numbers from the resume where available.
4. Closing paragraph: interest in discussing further + a call to action.
5. Keep the whole letter under 400 words.`,
  });

  // Defense-in-depth: scrub any placeholder the model still emitted and fall
  // back to a safe greeting if it nuked itself.
  const greeting = stripPlaceholders(object.greeting) || "Dear Hiring Manager,";
  const paragraphs = object.paragraphs
    .map(stripPlaceholders)
    .filter(Boolean);
  const closing = stripPlaceholders(object.closing) || "Sincerely,";
  const signature = stripPlaceholders(object.signature) || resume.basics.name;

  return [greeting, ...paragraphs, closing, signature].join("\n\n");
}
