import OpenAI from "openai";

/**
 * Lazy-loaded OpenAI client to avoid build-time errors.
 */
let openaiClient: OpenAI | null = null;

/**
 * Get the OpenAI client instance (lazy initialization).
 */
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Types of content that can be improved or generated.
 */
export type ContentType =
  | "summary"
  | "work_highlight"
  | "project_description"
  | "skill_keywords";

/**
 * Context provided for AI suggestions.
 */
interface SuggestionContext {
  jobTitle?: string;
  industry?: string;
  yearsOfExperience?: number;
  existingContent?: string;
  targetRole?: string;
}

/**
 * Service for AI-powered resume content suggestions.
 * Uses OpenAI GPT-4 for high-quality professional content.
 */
export const aiService = {
  /**
   * Improve existing resume content.
   * @param contentType - The type of content being improved
   * @param content - The existing content to improve
   * @param context - Additional context for better suggestions
   * @returns Improved version of the content
   */
  async improveContent(
    contentType: ContentType,
    content: string,
    context: SuggestionContext = {}
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(contentType);
    const userPrompt = this.buildUserPrompt(contentType, content, context);

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || content;
  },

  /**
   * Generate multiple suggestions for a content type.
   * @param contentType - The type of content to generate
   * @param context - Context for generating relevant suggestions
   * @param count - Number of suggestions to generate
   * @returns Array of suggested content
   */
  async generateSuggestions(
    contentType: ContentType,
    context: SuggestionContext,
    count: number = 3
  ): Promise<string[]> {
    const systemPrompt = this.getSystemPrompt(contentType);
    const userPrompt = this.buildGenerationPrompt(contentType, context, count);

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    return this.parseSuggestions(content, count);
  },

  /**
   * Generate bullet points for work experience.
   * @param jobTitle - The job title
   * @param company - The company name
   * @param description - Brief description of responsibilities
   * @returns Array of achievement-focused bullet points
   */
  async generateWorkHighlights(
    jobTitle: string,
    company: string,
    description: string
  ): Promise<string[]> {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer. Generate 3-5 impactful bullet points for work experience.
Each bullet point should:
- Start with a strong action verb
- Include quantifiable achievements when possible
- Be concise (under 15 words)
- Focus on results and impact
Format: Return each bullet point on a new line, without numbering or bullet characters.`,
        },
        {
          role: "user",
          content: `Job Title: ${jobTitle}
Company: ${company}
Description: ${description}

Generate professional achievement-focused bullet points.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  },

  /**
   * Suggest relevant skills based on job title and industry.
   * @param jobTitle - The target job title
   * @param industry - The industry or domain
   * @returns Array of suggested skills
   */
  async suggestSkills(
    jobTitle: string,
    industry: string
  ): Promise<{ category: string; keywords: string[] }[]> {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a career expert. Suggest relevant technical and soft skills for a resume.
Return skills grouped by category in this exact JSON format:
[{"category": "Category Name", "keywords": ["skill1", "skill2", "skill3"]}]
Include 3-4 categories with 4-6 skills each.`,
        },
        {
          role: "user",
          content: `Suggest relevant skills for a ${jobTitle} in the ${industry} industry.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content?.trim() || "[]";
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Get the system prompt for a content type.
   */
  getSystemPrompt(contentType: ContentType): string {
    const prompts: Record<ContentType, string> = {
      summary: `You are an expert resume writer specializing in professional summaries.
Create concise, impactful summaries that highlight key qualifications and career goals.
Keep summaries between 2-4 sentences. Use professional language without first-person pronouns.`,

      work_highlight: `You are an expert resume writer specializing in work experience descriptions.
Create achievement-focused bullet points that demonstrate impact and results.
Use strong action verbs and quantify achievements when possible.`,

      project_description: `You are an expert resume writer specializing in project descriptions.
Create concise descriptions that highlight technologies used, your role, and the project's impact.
Focus on technical achievements and problem-solving abilities.`,

      skill_keywords: `You are a career expert with deep knowledge of industry skills and keywords.
Suggest relevant technical and soft skills that match job descriptions.
Focus on in-demand skills and industry-specific terminology.`,
    };

    return prompts[contentType];
  },

  /**
   * Build the user prompt for content improvement.
   */
  buildUserPrompt(
    contentType: ContentType,
    content: string,
    context: SuggestionContext
  ): string {
    let prompt = `Improve the following ${contentType.replace("_", " ")}:\n\n"${content}"\n`;

    if (context.targetRole) {
      prompt += `\nTarget role: ${context.targetRole}`;
    }
    if (context.industry) {
      prompt += `\nIndustry: ${context.industry}`;
    }
    if (context.yearsOfExperience) {
      prompt += `\nExperience level: ${context.yearsOfExperience} years`;
    }

    prompt += `\n\nProvide only the improved version, no explanations.`;
    return prompt;
  },

  /**
   * Build the user prompt for content generation.
   */
  buildGenerationPrompt(
    contentType: ContentType,
    context: SuggestionContext,
    count: number
  ): string {
    let prompt = `Generate ${count} ${contentType.replace("_", " ")} options.\n`;

    if (context.targetRole) {
      prompt += `Target role: ${context.targetRole}\n`;
    }
    if (context.industry) {
      prompt += `Industry: ${context.industry}\n`;
    }
    if (context.jobTitle) {
      prompt += `Current job title: ${context.jobTitle}\n`;
    }
    if (context.yearsOfExperience) {
      prompt += `Years of experience: ${context.yearsOfExperience}\n`;
    }
    if (context.existingContent) {
      prompt += `Existing content for reference: "${context.existingContent}"\n`;
    }

    prompt += `\nProvide ${count} distinct options, each on a new line. Number them 1., 2., 3., etc.`;
    return prompt;
  },

  /**
   * Parse numbered suggestions from AI response.
   */
  parseSuggestions(content: string, expectedCount: number): string[] {
    const lines = content.split("\n").filter((line) => line.trim());
    const suggestions: string[] = [];

    for (const line of lines) {
      // Remove numbering like "1.", "1)", "- ", etc.
      const cleaned = line.replace(/^[\d]+[.)]\s*|-\s*/, "").trim();
      if (cleaned.length > 0) {
        suggestions.push(cleaned);
      }
    }

    return suggestions.slice(0, expectedCount);
  },
};
