import { generateObject } from "ai";
import { ResumeData, resumeDataSchema } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { reasonModel, WRITING_TEMPERATURE, reasonSampling } from "./models";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";

/**
 * Apply a targeted, minimal-diff revision to an already-tailored resume in
 * response to first-class USER FEEDBACK.
 *
 * This is deliberately NOT a re-tailor: the resume has already been fitted to the
 * job. Here the candidate is asking for a specific wording change (e.g. "make the
 * summary punchier", "emphasize leadership in the first role"). The model must
 * honor that request while keeping structure, ordering, and every fact identical
 * — same faithfulness contract the tailoring step is held to.
 *
 * Mechanics mirror `tailorResume` exactly (reason tier, disabled SDK retries so
 * the pipeline's runStep owns backoff, non-strict JSON schema) so the two steps
 * behave identically under retry/telemetry.
 *
 * @param resume The current (already-tailored) resume to revise.
 * @param jd The parsed target job, kept in context so revisions stay job-targeted.
 * @param feedback The user's revision request, verbatim.
 * @param correctionNotes Optional faithfulness-violation notes for a single
 *   corrective pass (same mechanism `tailorResume` uses).
 */
export async function reviseResume(
  resume: ResumeData,
  jd: ParsedJD,
  feedback: string,
  correctionNotes?: string
): Promise<ResumeData> {
  const correctionBlock = correctionNotes
    ? `\n\nCORRECTION NOTES (your previous revision introduced these problems — fix them WITHOUT adding any new facts):\n${correctionNotes}`
    : "";

  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: resumeDataSchema,
    ...reasonSampling(WRITING_TEMPERATURE),
    providerOptions: { openai: { strictJsonSchema: false } },
    experimental_telemetry: aiTelemetry("revise-resume", {
      promptVersion: PROMPT_VERSIONS["revise-resume"],
    }),
    prompt: `You are an expert resume writer making a TARGETED revision to a resume that is already tailored to the job below. Apply the user's feedback with the SMALLEST possible change.

USER FEEDBACK (the revision the candidate asked for — honor it precisely):
${feedback}

RULES:
1. Make a MINIMAL-DIFF wording revision that satisfies the feedback. Do NOT re-tailor or restructure the resume: keep the same sections, the same entries, the same ordering, and the same number of bullet points unless the feedback explicitly asks otherwise.
2. NEVER fabricate experience, skills, or qualifications the candidate doesn't have. Do NOT add skills to the skills section that don't already appear in the current resume.
3. Keep all dates, companies, institutions, contact details, and factual details unchanged. Never invent metrics — only use numbers already present in the resume.
4. Do NOT add contact details (email, phone, location) that are empty in the current resume.
5. Only touch the parts of the resume the feedback is about; leave everything else byte-for-byte as it is.

CURRENT RESUME (this is the base — revise it, do not rebuild it):
${JSON.stringify(resume, null, 2)}

TARGET JOB (for context — keep the revision job-targeted):
Title: ${jd.title} at ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}
Keywords: ${jd.keywords.join(", ")}${correctionBlock}

Return the complete revised resume data. Preserve all structural fields.`,
  });

  return object;
}
