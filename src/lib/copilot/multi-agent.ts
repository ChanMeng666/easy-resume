"use client";

import { useState, useCallback } from "react";

/**
 * Agent types available in the multi-agent system.
 */
export type AgentType = "content-writer" | "ats-optimizer" | "design-advisor";

/**
 * Agent status.
 */
export type AgentStatus = "idle" | "running" | "completed" | "error";

/**
 * Individual agent state.
 */
export interface AgentState {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastResult: string | null;
  lastError: string | null;
  runCount: number;
}

/**
 * Content Writer Agent state.
 */
export interface ContentWriterState extends AgentState {
  specialty: string;
  generatedContent: string[];
}

/**
 * ATS Optimizer Agent state.
 */
export interface ATSOptimizerState extends AgentState {
  keywords: string[];
  score: number;
  suggestions: string[];
}

/**
 * Design Advisor Agent state.
 */
export interface DesignAdvisorState extends AgentState {
  recommendedTemplate: string | null;
  recommendations: string[];
}

/**
 * Multi-agent coordinator state.
 */
export interface MultiAgentState {
  contentWriter: ContentWriterState;
  atsOptimizer: ATSOptimizerState;
  designAdvisor: DesignAdvisorState;
  isCoordinating: boolean;
  lastCoordinationResult: MultiAgentResult | null;
}

/**
 * Result from running all agents.
 */
export interface MultiAgentResult {
  contentResult: string;
  atsResult: {
    score: number;
    keywords: string[];
    suggestions: string[];
  };
  designResult: {
    recommendedTemplate: string;
    recommendations: string[];
  };
  timestamp: string;
}

/**
 * Initial state for the Content Writer Agent.
 */
const initialContentWriterState: ContentWriterState = {
  id: "content-writer",
  name: "Content Writer",
  description: "Focuses on compelling, achievement-focused resume content",
  status: "idle",
  lastResult: null,
  lastError: null,
  runCount: 0,
  specialty: "achievement-focused content",
  generatedContent: [],
};

/**
 * Initial state for the ATS Optimizer Agent.
 */
const initialATSOptimizerState: ATSOptimizerState = {
  id: "ats-optimizer",
  name: "ATS Optimizer",
  description: "Ensures ATS compatibility and keyword optimization",
  status: "idle",
  lastResult: null,
  lastError: null,
  runCount: 0,
  keywords: [],
  score: 0,
  suggestions: [],
};

/**
 * Initial state for the Design Advisor Agent.
 */
const initialDesignAdvisorState: DesignAdvisorState = {
  id: "design-advisor",
  name: "Design Advisor",
  description: "Recommends templates and formatting for your industry",
  status: "idle",
  lastResult: null,
  lastError: null,
  runCount: 0,
  recommendedTemplate: null,
  recommendations: [],
};

/**
 * Hook for the Content Writer Agent.
 */
export function useContentWriterAgent() {
  const [state, setState] = useState<ContentWriterState>(initialContentWriterState);

  const run = useCallback(async (task: string): Promise<string> => {
    setState((prev) => ({ ...prev, status: "running" }));
    
    try {
      // Simulate content generation (in real implementation, this would call the AI)
      const result = `Content generated for: ${task}`;
      
      setState((prev) => ({
        ...prev,
        status: "completed",
        lastResult: result,
        runCount: prev.runCount + 1,
        generatedContent: [...prev.generatedContent, result],
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        status: "error",
        lastError: errorMessage,
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialContentWriterState);
  }, []);

  return { state, run, reset };
}

/**
 * Hook for the ATS Optimizer Agent.
 */
export function useATSOptimizerAgent() {
  const [state, setState] = useState<ATSOptimizerState>(initialATSOptimizerState);

  const run = useCallback(async (content: string, targetKeywords?: string[]): Promise<ATSOptimizerState["suggestions"]> => {
    setState((prev) => ({ ...prev, status: "running" }));
    
    try {
      // Simulate ATS analysis
      const keywords = targetKeywords || extractKeywords(content);
      const score = calculateATSScore(content, keywords);
      const suggestions = generateATSSuggestions(content, keywords);
      
      setState((prev) => ({
        ...prev,
        status: "completed",
        lastResult: `ATS Score: ${score}/100`,
        runCount: prev.runCount + 1,
        keywords,
        score,
        suggestions,
      }));
      
      return suggestions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        status: "error",
        lastError: errorMessage,
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialATSOptimizerState);
  }, []);

  return { state, run, reset };
}

/**
 * Hook for the Design Advisor Agent.
 */
export function useDesignAdvisorAgent() {
  const [state, setState] = useState<DesignAdvisorState>(initialDesignAdvisorState);

  const run = useCallback(async (industry: string, experience: number): Promise<string> => {
    setState((prev) => ({ ...prev, status: "running" }));
    
    try {
      // Simulate design recommendation
      const recommendedTemplate = recommendTemplate(industry, experience);
      const recommendations = generateDesignRecommendations(industry, experience);
      
      setState((prev) => ({
        ...prev,
        status: "completed",
        lastResult: `Recommended: ${recommendedTemplate}`,
        runCount: prev.runCount + 1,
        recommendedTemplate,
        recommendations,
      }));
      
      return recommendedTemplate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        status: "error",
        lastError: errorMessage,
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialDesignAdvisorState);
  }, []);

  return { state, run, reset };
}

/**
 * Hook for coordinating multiple agents.
 */
export function useMultiAgentCoordinator() {
  const contentWriter = useContentWriterAgent();
  const atsOptimizer = useATSOptimizerAgent();
  const designAdvisor = useDesignAdvisorAgent();
  
  const [isCoordinating, setIsCoordinating] = useState(false);
  const [lastResult, setLastResult] = useState<MultiAgentResult | null>(null);

  /**
   * Run all agents in sequence for a comprehensive analysis.
   */
  const runAllAgents = useCallback(async (
    task: string,
    industry: string,
    experience: number,
    targetKeywords?: string[]
  ): Promise<MultiAgentResult> => {
    setIsCoordinating(true);
    
    try {
      // Step 1: Content Writer generates content
      const contentResult = await contentWriter.run(task);
      
      // Step 2: ATS Optimizer analyzes the content
      await atsOptimizer.run(contentResult, targetKeywords);
      
      // Step 3: Design Advisor recommends template
      await designAdvisor.run(industry, experience);
      
      const result: MultiAgentResult = {
        contentResult,
        atsResult: {
          score: atsOptimizer.state.score,
          keywords: atsOptimizer.state.keywords,
          suggestions: atsOptimizer.state.suggestions,
        },
        designResult: {
          recommendedTemplate: designAdvisor.state.recommendedTemplate || "two-column",
          recommendations: designAdvisor.state.recommendations,
        },
        timestamp: new Date().toISOString(),
      };
      
      setLastResult(result);
      return result;
    } finally {
      setIsCoordinating(false);
    }
  }, [contentWriter, atsOptimizer, designAdvisor]);

  /**
   * Reset all agents.
   */
  const resetAll = useCallback(() => {
    contentWriter.reset();
    atsOptimizer.reset();
    designAdvisor.reset();
    setLastResult(null);
  }, [contentWriter, atsOptimizer, designAdvisor]);

  /**
   * Get combined state of all agents.
   */
  const getState = useCallback((): MultiAgentState => ({
    contentWriter: contentWriter.state,
    atsOptimizer: atsOptimizer.state,
    designAdvisor: designAdvisor.state,
    isCoordinating,
    lastCoordinationResult: lastResult,
  }), [contentWriter.state, atsOptimizer.state, designAdvisor.state, isCoordinating, lastResult]);

  return {
    contentWriter,
    atsOptimizer,
    designAdvisor,
    runAllAgents,
    resetAll,
    getState,
    isCoordinating,
    lastResult,
  };
}

// ===== Helper Functions =====

/**
 * Extract keywords from content (simplified).
 */
function extractKeywords(content: string): string[] {
  const commonKeywords = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "AWS", "Docker", "Kubernetes", "SQL", "NoSQL",
    "Machine Learning", "AI", "Data Science", "Cloud",
    "Agile", "Scrum", "Leadership", "Team Lead",
  ];
  
  return commonKeywords.filter((keyword) =>
    content.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Calculate ATS score (simplified).
 */
function calculateATSScore(content: string, keywords: string[]): number {
  const baseScore = 50;
  const keywordBonus = Math.min(keywords.length * 5, 30);
  const lengthBonus = Math.min(content.length / 100, 20);
  
  return Math.min(Math.round(baseScore + keywordBonus + lengthBonus), 100);
}

/**
 * Generate ATS suggestions (simplified).
 */
function generateATSSuggestions(content: string, keywords: string[]): string[] {
  const suggestions: string[] = [];
  
  if (keywords.length < 5) {
    suggestions.push("Add more relevant technical keywords");
  }
  
  if (!content.includes("%") && !content.includes("$")) {
    suggestions.push("Quantify your achievements with numbers, percentages, or dollar amounts");
  }
  
  if (content.length < 500) {
    suggestions.push("Expand your content with more details about your accomplishments");
  }
  
  const actionVerbs = ["Led", "Developed", "Implemented", "Optimized", "Managed"];
  const hasActionVerbs = actionVerbs.some((verb) => content.includes(verb));
  if (!hasActionVerbs) {
    suggestions.push("Start bullet points with strong action verbs (Led, Developed, Implemented)");
  }
  
  return suggestions;
}

/**
 * Recommend template based on industry and experience.
 */
function recommendTemplate(industry: string, experience: number): string {
  const industryLower = industry.toLowerCase();
  
  if (industryLower.includes("finance") || industryLower.includes("banking")) {
    return experience >= 8 ? "executive" : "banking";
  }
  
  if (industryLower.includes("tech") || industryLower.includes("software")) {
    return experience >= 10 ? "executive" : "modern-cv";
  }
  
  if (industryLower.includes("creative") || industryLower.includes("design")) {
    return "creative";
  }
  
  if (industryLower.includes("academic") || industryLower.includes("research")) {
    return "academic";
  }
  
  return experience >= 10 ? "executive" : "two-column";
}

/**
 * Generate design recommendations.
 */
function generateDesignRecommendations(industry: string, experience: number): string[] {
  const recommendations: string[] = [];
  
  if (experience >= 10) {
    recommendations.push("Use an executive or professional template to highlight your seniority");
    recommendations.push("Consider a two-column layout to efficiently display your extensive experience");
  } else if (experience >= 5) {
    recommendations.push("A modern template will help you stand out while remaining professional");
    recommendations.push("Ensure your skills section is prominent and well-organized");
  } else {
    recommendations.push("Focus on education and projects to compensate for limited experience");
    recommendations.push("Use a clean, simple template that highlights your potential");
  }
  
  if (industry.toLowerCase().includes("creative")) {
    recommendations.push("Consider adding a portfolio link or visual elements");
  }
  
  return recommendations;
}

/**
 * Type for the return value of useMultiAgentCoordinator.
 */
export type MultiAgentCoordinator = ReturnType<typeof useMultiAgentCoordinator>;
