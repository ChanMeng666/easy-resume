import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";

/**
 * Generates a professional cover letter tailored to a specific job description.
 * Uses the candidate's resume data and JD analysis to create a compelling letter.
 */
export async function generateCoverLetter(
  resume: ResumeData,
  jd: ParsedJD
): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt: `Write a professional cover letter for this candidate applying to the specified job.

CANDIDATE:
Name: ${resume.basics.name}
Title: ${resume.basics.label}
Email: ${resume.basics.email}
Phone: ${resume.basics.phone}
Location: ${resume.basics.location}
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

GUIDELINES:
1. Professional but engaging tone
2. 3-4 paragraphs max
3. Opening: Express enthusiasm and mention specific role + company
4. Body: Connect 2-3 key experiences/skills to job requirements with specific examples
5. Closing: Express interest in discussing further, include call to action
6. Do NOT use generic filler phrases like "I am writing to express my interest"
7. Start with something specific about the company or role
8. Use concrete numbers and achievements from the resume
9. Keep it under 400 words`,
  });

  return text;
}
