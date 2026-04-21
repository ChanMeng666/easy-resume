import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Schema for a parsed job description.
 */
export const parsedJDSchema = z.object({
  title: z.string().describe("Job title"),
  company: z.string().describe("Company name"),
  location: z.string().describe("Job location or 'Remote'"),
  type: z.string().describe("Employment type: full-time, part-time, contract, internship"),
  experienceLevel: z.string().describe("Experience level: entry, mid, senior, lead, executive"),
  salary: z.string().optional().describe("Salary range if mentioned"),
  summary: z.string().describe("Brief 2-3 sentence summary of the role"),
  requiredSkills: z.array(z.string()).describe("Required technical and soft skills"),
  preferredSkills: z.array(z.string()).describe("Nice-to-have skills"),
  keywords: z.array(z.string()).describe("ATS-critical keywords from the posting"),
  responsibilities: z.array(z.string()).describe("Key job responsibilities"),
  requirements: z.array(z.string()).describe("Required qualifications"),
  benefits: z.array(z.string()).describe("Listed benefits and perks"),
  industry: z.string().describe("Industry sector"),
});

export type ParsedJD = z.infer<typeof parsedJDSchema>;

/**
 * Parses raw job description text into structured data using GPT-4o.
 * Extracts skills, keywords, requirements, and other critical information for ATS matching.
 */
export async function parseJobDescription(rawText: string): Promise<ParsedJD> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: parsedJDSchema,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `Parse the following job description into structured data.
Extract all relevant information including skills, keywords, requirements, and responsibilities.
For keywords, focus on terms that ATS systems would scan for.
For skills, separate into required vs preferred/nice-to-have.

Job Description:
${rawText}`,
  });

  return object;
}
