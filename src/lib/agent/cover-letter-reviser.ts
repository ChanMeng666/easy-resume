import { generateObject } from "ai";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { reasonModel, WRITING_TEMPERATURE, reasonSampling, reasonReasoning } from "./models";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";
import { coverLetterSchema, stripPlaceholders } from "./cover-letter";

/**
 * Build the cover-letter REVISION prompt. Pure + exported so it can be unit
 * tested without an LLM call (mirrors `buildCoverLetterPrompt`).
 *
 * When a `voiceSample` is supplied (the candidate's own writing, re-fetched from
 * their saved profile) it is injected ABOVE the HARD RULES as a voice reference
 * plus an extra rule 6, so a heavy refine keeps the letter in the candidate's
 * voice. The voice block is deliberately SUBORDINATE to the minimal-diff +
 * no-new-facts HARD RULES: matching voice must never enlarge the diff, copy the
 * sample verbatim, override a HARD RULE, or introduce a fact. When absent, the
 * prompt is byte-for-byte identical to the voice-free baseline.
 */
export function buildReviseCoverLetterPrompt(
  currentLetter: string,
  resume: ResumeData,
  jd: ParsedJD,
  feedback: string,
  voiceSample?: string
): string {
  const voiceBlock = voiceSample
    ? `WRITING VOICE SAMPLE (the candidate's own writing — match this voice):
"""
${voiceSample}
"""

`
    : "";

  const voiceStyleRule = voiceSample
    ? `\n6. Keep the revised letter in the writing voice of the sample above — its sentence rhythm, length, formality, and vocabulary. This is subordinate to the rules above: it must NOT enlarge the minimal diff, must NOT copy any sentence or phrase from the sample verbatim, must NOT override any HARD RULE, and must NOT introduce any fact absent from the candidate data.`
    : "";

  return `Revise the cover letter below to satisfy the user's feedback with the SMALLEST possible change. Keep the candidate's existing letter — do NOT rewrite it from scratch.

CURRENT COVER LETTER (this is the base — revise it, do not replace it):
${currentLetter}

USER FEEDBACK (the revision the candidate asked for — honor it precisely):
${feedback}

CANDIDATE (for grounding — never invent facts beyond these):
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Key Skills: ${resume.skills.flatMap((s) => s.keywords).slice(0, 20).join(", ")}

TARGET JOB (for context):
Title: ${jd.title}
Company: ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}

${voiceBlock}HARD RULES:
1. Make a MINIMAL-DIFF revision that satisfies the feedback. Preserve the paragraphs and content the feedback does not touch.
2. NEVER output bracket placeholders such as "[Company]", "[Hiring Manager]", or "[Position]". Use the real company/role names above. If the hiring manager's name is unknown, the greeting MUST be exactly "Dear Hiring Manager,".
3. Only reference achievements, skills, and experience that appear in the candidate data above. Do NOT invent metrics, employers, or accomplishments.
4. Use the signature field for the candidate's real name ("${resume.basics.name}").
5. Keep the whole letter under 400 words and to 2-4 body paragraphs.${voiceStyleRule}`;
}

/**
 * Apply a targeted, minimal-diff revision to an existing cover letter in response
 * to first-class USER FEEDBACK.
 *
 * Mirrors `generateCoverLetter`'s mechanics (reason tier, structured
 * greeting/paragraphs/closing/signature output, disabled SDK retries, the shared
 * placeholder scrub + safe-greeting fallback) so the revised letter passes the
 * same shape/authenticity guarantees. The difference is intent: this keeps the
 * candidate's existing letter and only changes what the feedback asks for, rather
 * than writing a fresh one.
 *
 * @param currentLetter The existing assembled cover-letter text to revise.
 * @param resume The candidate resume, for grounding (no invented facts).
 * @param jd The parsed target job, for context.
 * @param feedback The user's revision request, verbatim.
 * @param voiceSample Optional writing sample (from a saved profile) to keep the
 *   revised letter in the candidate's voice. Content-quality only — never billing.
 * @returns The revised cover letter as assembled plain text.
 */
export async function reviseCoverLetter(
  currentLetter: string,
  resume: ResumeData,
  jd: ParsedJD,
  feedback: string,
  voiceSample?: string
): Promise<string> {
  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: coverLetterSchema,
    ...reasonSampling(WRITING_TEMPERATURE),
    providerOptions: { openai: { strictJsonSchema: false, ...reasonReasoning() } },
    experimental_telemetry: aiTelemetry("revise-cover-letter", {
      promptVersion: PROMPT_VERSIONS["revise-cover-letter"],
    }),
    prompt: buildReviseCoverLetterPrompt(currentLetter, resume, jd, feedback, voiceSample),
  });

  // Defense-in-depth, identical to generateCoverLetter: scrub any placeholder the
  // model still emitted and fall back to a safe greeting if it nuked itself.
  const greeting = stripPlaceholders(object.greeting) || "Dear Hiring Manager,";
  const paragraphs = object.paragraphs.map(stripPlaceholders).filter(Boolean);
  const closing = stripPlaceholders(object.closing) || "Sincerely,";
  const signature = stripPlaceholders(object.signature) || resume.basics.name;

  return [greeting, ...paragraphs, closing, signature].join("\n\n");
}
