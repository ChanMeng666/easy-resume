import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { resumeDataSchema, type ResumeData } from "@/lib/validation/schema";

/**
 * Parses a user's free-text background description into structured ResumeData using GPT-4o.
 * Infers missing fields, creates professional bullet points, and categorizes skills.
 */
export async function parseBackground(
  backgroundText: string
): Promise<ResumeData> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: resumeDataSchema,
    prompt: `You are an expert resume writer. Parse the following free-text background description into structured resume data.

Instructions:
- Extract all available information into the appropriate fields.
- Infer reasonable values for missing fields. For example, if no phone is given, use "+1 (555) 000-0000" as a placeholder. If no email is given, use a plausible one based on the person's name.
- Create professional, achievement-oriented bullet points for work highlights. Use strong action verbs and quantify impact where possible.
- Categorize skills into logical groups (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills"). Always include at least 1 skill category.
- If the text is very brief, expand it into a reasonable resume structure with plausible details.
- For dates, use the format "Mar 2023", "Jan 2020", etc.
- Set endDate to "PRESENT" for current positions or ongoing education.
- For profiles, include any mentioned LinkedIn, GitHub, or portfolio URLs.
- For location, use "City, State" or "City, Country" format.
- For employment type, use one of: "Full-time", "Part-time", "Contract", "Internship", "Freelance".
- For studyType, use values like "Bachelor of Science", "Master of Arts", "Ph.D.", etc.

Background Description:
${backgroundText}`,
  });

  return object;
}
