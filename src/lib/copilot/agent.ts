"use client";

import { useState, useCallback } from "react";
import { ResumeData } from "@/lib/validation/schema";

/**
 * Agent state interface for tracking resume generation progress.
 */
export interface ResumeAgentState {
  currentSection: string | null;
  generationProgress: number;
  lastAction: string | null;
  isGenerating: boolean;
  generatedSections: string[];
}

/**
 * Initial state for the resume agent.
 */
const initialAgentState: ResumeAgentState = {
  currentSection: null,
  generationProgress: 0,
  lastAction: null,
  isGenerating: false,
  generatedSections: [],
};

/**
 * Custom hook for managing resume agent state and interactions.
 * Provides unified API for agent state management, undo/redo, and progress tracking.
 */
export function useResumeAgent() {
  const [state, setState] = useState<ResumeAgentState>(initialAgentState);
  const [history, setHistory] = useState<ResumeData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * Update agent state.
   */
  const updateState = useCallback((updates: Partial<ResumeAgentState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Start generation for a section.
   */
  const startGeneration = useCallback((section: string) => {
    setState((prev) => ({
      ...prev,
      currentSection: section,
      isGenerating: true,
      generationProgress: 0,
    }));
  }, []);

  /**
   * Update generation progress.
   */
  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      generationProgress: Math.min(100, progress),
    }));
  }, []);

  /**
   * Complete generation for current section.
   */
  const completeGeneration = useCallback((section: string) => {
    setState((prev) => ({
      ...prev,
      currentSection: null,
      isGenerating: false,
      generationProgress: 100,
      lastAction: `Generated ${section}`,
      generatedSections: [...prev.generatedSections, section],
    }));
  }, []);

  /**
   * Reset agent state.
   */
  const resetState = useCallback(() => {
    setState(initialAgentState);
  }, []);

  /**
   * Add a resume snapshot to history for undo/redo.
   */
  const addToHistory = useCallback((data: ResumeData) => {
    setHistory((prev) => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, data];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  /**
   * Check if undo is available.
   */
  const canUndo = historyIndex > 0;

  /**
   * Check if redo is available.
   */
  const canRedo = historyIndex < history.length - 1;

  /**
   * Undo to previous state.
   */
  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex((prev) => prev - 1);
      return history[historyIndex - 1];
    }
    return null;
  }, [canUndo, history, historyIndex]);

  /**
   * Redo to next state.
   */
  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex((prev) => prev + 1);
      return history[historyIndex + 1];
    }
    return null;
  }, [canRedo, history, historyIndex]);

  /**
   * Get current history position info.
   */
  const getHistoryInfo = useCallback(() => ({
    current: historyIndex + 1,
    total: history.length,
    canUndo,
    canRedo,
  }), [historyIndex, history.length, canUndo, canRedo]);

  return {
    state,
    updateState,
    startGeneration,
    updateProgress,
    completeGeneration,
    resetState,
    // History/Time Travel
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryInfo,
  };
}

/**
 * Type for the return value of useResumeAgent.
 */
export type ResumeAgent = ReturnType<typeof useResumeAgent>;
