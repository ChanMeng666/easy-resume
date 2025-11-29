import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { aiService, ContentType } from "@/lib/services/aiService";

/**
 * POST /api/ai/suggest - Generate AI suggestions for resume content.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, contentType, content, context, count } = body;

    // Validate content type
    const validContentTypes: ContentType[] = [
      "summary",
      "work_highlight",
      "project_description",
      "skill_keywords",
    ];
    if (contentType && !validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = [
      "improve",
      "generate",
      "work_highlights",
      "suggest_skills",
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "improve":
        if (!content || !contentType) {
          return NextResponse.json(
            { error: "Content and contentType are required for improve action" },
            { status: 400 }
          );
        }
        result = await aiService.improveContent(contentType, content, context);
        return NextResponse.json({ improved: result });

      case "generate":
        if (!contentType) {
          return NextResponse.json(
            { error: "ContentType is required for generate action" },
            { status: 400 }
          );
        }
        result = await aiService.generateSuggestions(
          contentType,
          context || {},
          count || 3
        );
        return NextResponse.json({ suggestions: result });

      case "work_highlights":
        const { jobTitle, company, description } = body;
        if (!jobTitle || !company || !description) {
          return NextResponse.json(
            {
              error:
                "jobTitle, company, and description are required for work_highlights",
            },
            { status: 400 }
          );
        }
        result = await aiService.generateWorkHighlights(
          jobTitle,
          company,
          description
        );
        return NextResponse.json({ highlights: result });

      case "suggest_skills":
        const { targetJobTitle, industry } = body;
        if (!targetJobTitle || !industry) {
          return NextResponse.json(
            {
              error:
                "targetJobTitle and industry are required for suggest_skills",
            },
            { status: 400 }
          );
        }
        result = await aiService.suggestSkills(targetJobTitle, industry);
        return NextResponse.json({ skills: result });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in AI suggestion:", error);

    // Handle OpenAI-specific errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "AI service configuration error" },
          { status: 503 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "AI service rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
