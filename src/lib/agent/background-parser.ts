import { generateObject } from "ai";
import { resumeDataSchema, type ResumeData } from "@/lib/validation/schema";
import { reasonModel, WRITING_TEMPERATURE } from "./models";
import { aiTelemetry } from "./telemetry";
import { PROMPT_VERSIONS } from "./prompt-registry";

/**
 * Parses a user's free-text background description into structured ResumeData.
 *
 * Authenticity-first: this step ONLY structures and polishes what the user
 * actually provided. It must never invent factual data (contact details,
 * employers, dates, degrees, metrics) — a resume with a fabricated phone number
 * or imagined job is unusable and erodes trust. Missing contact fields are left
 * empty (the schema allows it); the Typst generator simply omits those rows.
 */
export async function parseBackground(
  backgroundText: string
): Promise<ResumeData> {
  const { object } = await generateObject({
    model: reasonModel,
    // The pipeline owns retry/backoff (runStep); disable the SDK's own retries so
    // they don't compound (outer × SDK) on a persistently failing step.
    maxRetries: 0,
    schema: resumeDataSchema,
    temperature: WRITING_TEMPERATURE,
    providerOptions: { openai: { strictJsonSchema: false } },
    experimental_telemetry: aiTelemetry("parse-background", { promptVersion: PROMPT_VERSIONS["parse-background"] }),
    prompt: `You are an expert resume writer. Convert the following free-text background description into structured resume data.

ABSOLUTE RULE — NEVER FABRICATE:
- Use ONLY information the candidate actually provided. Do NOT invent employers, job titles, dates, degrees, institutions, certifications, metrics, or contact details.
- If a contact field (email, phone, location) is not given, leave it as an empty string "". NEVER use placeholders like "+1 (555) 000-0000" or guessed emails.
- Do NOT invent numbers or quantified results. Only include metrics the candidate stated.
- If the text is brief, keep the resume brief. Do NOT pad it with plausible-sounding but unstated experience, skills, or projects.

ALLOWED (rephrasing only, no new facts):
- Rewrite the candidate's stated work into clear, achievement-oriented bullet points using strong action verbs — but introduce no facts that aren't already implied by the input.
- Categorize the skills the candidate mentioned into logical groups (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills"). Include at least 1 category if any skill is mentioned.
- Normalize formatting only:
  - Dates as "Mar 2023", "Jan 2020", etc.; use "PRESENT" for current/ongoing roles or studies.
  - Location as "City, State" or "City, Country".
  - Employment type as one of: "Full-time", "Part-time", "Contract", "Internship", "Freelance".
  - studyType as "Bachelor of Science", "Master of Arts", "Ph.D.", etc.
- For profiles, include only LinkedIn / GitHub / portfolio URLs the candidate actually provided.

Background Description:
${backgroundText}`,
  });

  return object;
}
