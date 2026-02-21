import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { resumeDataSchema } from "@/lib/validation/schema";
import { parseJobDescription } from "@/lib/agent/jd-parser";
import { analyzeMatch } from "@/lib/agent/matching-engine";
import { scoreATS } from "@/lib/agent/ats-scorer";
import { tailorResume } from "@/lib/agent/resume-tailor";
import { generateCoverLetter } from "@/lib/agent/cover-letter";

/**
 * Main agent chat endpoint using Vercel AI SDK v6.
 * Handles streaming chat with server-side tool execution for resume editing,
 * job analysis, tailoring, ATS scoring, and cover letter generation.
 */
export async function POST(req: Request) {
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error("[agent/chat] OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "AI service is not configured. OPENAI_API_KEY is missing." },
      { status: 503 }
    );
  }

  let messages: UIMessage[];
  let resumeData: unknown;
  let templateId: string;

  try {
    const body = await req.json();
    messages = body.messages;
    resumeData = body.resumeData;
    templateId = body.templateId;
  } catch (err) {
    console.error("[agent/chat] Failed to parse request body:", err);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "Messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  try {
    const result = streamText({
      model: openai("gpt-4o"),
      system: `You are Vitex, an AI Career Agent. You help users build, edit, and optimize their resumes for specific jobs.

Your capabilities:
1. Edit resume sections (basics, work, education, skills, projects, achievements, certifications)
2. Parse job descriptions to extract key requirements
3. Analyze how well a resume matches a job
4. Tailor resumes for specific job descriptions
5. Score resumes for ATS compatibility
6. Generate cover letters

Current resume data is provided in the context. When the user asks to modify their resume, use the updateResume tool.
When discussing job matching, use parseJobDescription first, then analyzeMatch.
Be concise, professional, and proactive with suggestions.

Current Template: ${templateId || "two-column"}`,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      tools: {
        updateResume: tool({
          description: "Update the user's resume data. Use this when the user asks to add, modify, or remove any resume content.",
          inputSchema: z.object({
            resumeData: resumeDataSchema.describe("The complete updated resume data"),
            changeDescription: z.string().describe("Brief description of what changed"),
          }),
          execute: async ({ resumeData: newData, changeDescription }) => {
            return {
              success: true,
              changeDescription,
              data: newData,
            };
          },
        }),

        parseJobDescription: tool({
          description: "Parse a job description text into structured data. Use when the user provides a job posting.",
          inputSchema: z.object({
            rawText: z.string().describe("The raw job description text"),
          }),
          execute: async ({ rawText }) => {
            try {
              const parsed = await parseJobDescription(rawText);
              return { success: true, parsed };
            } catch (err) {
              console.error("[agent/chat] parseJobDescription failed:", err);
              return { success: false, error: "Failed to parse job description" };
            }
          },
        }),

        analyzeJobMatch: tool({
          description: "Analyze how well the current resume matches a parsed job description.",
          inputSchema: z.object({
            parsedJD: z.any().describe("The parsed job description object"),
          }),
          execute: async ({ parsedJD }) => {
            if (!resumeData) return { success: false, error: "No resume data available" };
            try {
              const analysis = await analyzeMatch(resumeData as import("@/lib/validation/schema").ResumeData, parsedJD);
              return { success: true, analysis };
            } catch (err) {
              console.error("[agent/chat] analyzeJobMatch failed:", err);
              return { success: false, error: "Failed to analyze job match" };
            }
          },
        }),

        tailorResumeToJob: tool({
          description: "Tailor the current resume for a specific job. Returns a modified resume optimized for the target role.",
          inputSchema: z.object({
            parsedJD: z.any().describe("The parsed job description"),
            matchAnalysis: z.any().describe("The match analysis result"),
          }),
          execute: async ({ parsedJD, matchAnalysis }) => {
            if (!resumeData) return { success: false, error: "No resume data available" };
            try {
              const tailored = await tailorResume(resumeData as import("@/lib/validation/schema").ResumeData, parsedJD, matchAnalysis);
              return { success: true, data: tailored };
            } catch (err) {
              console.error("[agent/chat] tailorResumeToJob failed:", err);
              return { success: false, error: "Failed to tailor resume" };
            }
          },
        }),

        scoreATSCompatibility: tool({
          description: "Score the resume for ATS compatibility, optionally against a specific job description.",
          inputSchema: z.object({
            parsedJD: z.any().optional().describe("Optional parsed JD for targeted scoring"),
          }),
          execute: async ({ parsedJD }) => {
            if (!resumeData) return { success: false, error: "No resume data available" };
            try {
              const report = await scoreATS(resumeData as import("@/lib/validation/schema").ResumeData, parsedJD || undefined);
              return { success: true, report };
            } catch (err) {
              console.error("[agent/chat] scoreATSCompatibility failed:", err);
              return { success: false, error: "Failed to score ATS compatibility" };
            }
          },
        }),

        generateCoverLetterTool: tool({
          description: "Generate a cover letter based on the resume and a job description.",
          inputSchema: z.object({
            parsedJD: z.any().describe("The parsed job description"),
          }),
          execute: async ({ parsedJD }) => {
            if (!resumeData) return { success: false, error: "No resume data available" };
            try {
              const coverLetter = await generateCoverLetter(resumeData as import("@/lib/validation/schema").ResumeData, parsedJD);
              return { success: true, coverLetter };
            } catch (err) {
              console.error("[agent/chat] generateCoverLetterTool failed:", err);
              return { success: false, error: "Failed to generate cover letter" };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agent/chat] Stream error:", message);

    // Surface specific error types for easier diagnosis
    if (message.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY." },
        { status: 401 }
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return NextResponse.json(
        { error: "OpenAI rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }
    if (message.includes("model") || message.includes("404")) {
      return NextResponse.json(
        { error: `Model error: ${message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Agent chat failed: ${message}` },
      { status: 500 }
    );
  }
}
