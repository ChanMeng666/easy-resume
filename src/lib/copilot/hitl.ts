"use client";

import { useState, useCallback } from "react";

/**
 * Confirmation request data.
 */
export interface ConfirmationRequest {
  id: string;
  type: "destructive" | "replace" | "clear" | "import";
  title: string;
  description: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Confirmation response.
 */
export type ConfirmationResponse = "confirmed" | "cancelled" | "modified";

/**
 * Pending confirmation with resolve function.
 */
interface PendingConfirmation {
  request: ConfirmationRequest;
  resolve: (response: ConfirmationResponse) => void;
}

/**
 * Hook for Human-in-the-Loop confirmation management.
 * Provides a way to request user confirmation for critical actions.
 */
export function useHumanInTheLoop() {
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);

  /**
   * Request user confirmation for an action.
   * Returns a promise that resolves when the user responds.
   */
  const requestConfirmation = useCallback(async (
    type: ConfirmationRequest["type"],
    title: string,
    description: string,
    details?: Record<string, unknown>
  ): Promise<ConfirmationResponse> => {
    return new Promise((resolve) => {
      const request: ConfirmationRequest = {
        id: `confirm-${Date.now()}`,
        type,
        title,
        description,
        details,
        timestamp: new Date().toISOString(),
      };

      setPendingConfirmations((prev) => [
        ...prev,
        { request, resolve },
      ]);
    });
  }, []);

  /**
   * Respond to a confirmation request.
   */
  const respond = useCallback((requestId: string, response: ConfirmationResponse) => {
    setPendingConfirmations((prev) => {
      const index = prev.findIndex((p) => p.request.id === requestId);
      if (index !== -1) {
        const [pending] = prev.splice(index, 1);
        pending.resolve(response);
        return [...prev];
      }
      return prev;
    });
  }, []);

  /**
   * Confirm a request.
   */
  const confirm = useCallback((requestId: string) => {
    respond(requestId, "confirmed");
  }, [respond]);

  /**
   * Cancel a request.
   */
  const cancel = useCallback((requestId: string) => {
    respond(requestId, "cancelled");
  }, [respond]);

  /**
   * Get the current pending confirmation (first in queue).
   */
  const currentConfirmation = pendingConfirmations[0]?.request ?? null;

  /**
   * Check if there are pending confirmations.
   */
  const hasPendingConfirmations = pendingConfirmations.length > 0;

  return {
    requestConfirmation,
    respond,
    confirm,
    cancel,
    currentConfirmation,
    hasPendingConfirmations,
    pendingCount: pendingConfirmations.length,
  };
}

/**
 * Predefined confirmation messages for common actions.
 */
export const HITL_MESSAGES = {
  clearAllData: {
    type: "clear" as const,
    title: "Clear All Data?",
    description: "This will remove all your resume content. This action cannot be undone.",
  },
  replaceSection: (sectionName: string) => ({
    type: "replace" as const,
    title: `Replace ${sectionName}?`,
    description: `This will replace the entire ${sectionName} section with AI-generated content.`,
  }),
  importData: {
    type: "import" as const,
    title: "Import Resume Data?",
    description: "This will replace your current resume with the imported data.",
  },
  deleteWorkExperience: (company: string) => ({
    type: "destructive" as const,
    title: "Delete Work Experience?",
    description: `Remove the work experience at ${company}?`,
  }),
  deleteEducation: (institution: string) => ({
    type: "destructive" as const,
    title: "Delete Education?",
    description: `Remove the education entry from ${institution}?`,
  }),
  deleteProject: (name: string) => ({
    type: "destructive" as const,
    title: "Delete Project?",
    description: `Remove the project "${name}"?`,
  }),
  changeTemplate: (templateName: string) => ({
    type: "replace" as const,
    title: "Change Template?",
    description: `Switch to the ${templateName} template? Your content will be preserved.`,
  }),
};

/**
 * Hook to integrate HITL with resume operations.
 * Wraps dangerous operations with confirmation prompts.
 */
export function useConfirmedResumeActions(hitl: ReturnType<typeof useHumanInTheLoop>) {
  const { requestConfirmation } = hitl;

  /**
   * Clear all resume data with confirmation.
   */
  const confirmClearAll = useCallback(async (): Promise<boolean> => {
    const response = await requestConfirmation(
      HITL_MESSAGES.clearAllData.type,
      HITL_MESSAGES.clearAllData.title,
      HITL_MESSAGES.clearAllData.description
    );
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Replace a section with confirmation.
   */
  const confirmReplaceSection = useCallback(async (sectionName: string): Promise<boolean> => {
    const msg = HITL_MESSAGES.replaceSection(sectionName);
    const response = await requestConfirmation(msg.type, msg.title, msg.description);
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Delete work experience with confirmation.
   */
  const confirmDeleteWork = useCallback(async (company: string): Promise<boolean> => {
    const msg = HITL_MESSAGES.deleteWorkExperience(company);
    const response = await requestConfirmation(msg.type, msg.title, msg.description);
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Delete education with confirmation.
   */
  const confirmDeleteEducation = useCallback(async (institution: string): Promise<boolean> => {
    const msg = HITL_MESSAGES.deleteEducation(institution);
    const response = await requestConfirmation(msg.type, msg.title, msg.description);
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Delete project with confirmation.
   */
  const confirmDeleteProject = useCallback(async (name: string): Promise<boolean> => {
    const msg = HITL_MESSAGES.deleteProject(name);
    const response = await requestConfirmation(msg.type, msg.title, msg.description);
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Change template with confirmation.
   */
  const confirmChangeTemplate = useCallback(async (templateName: string): Promise<boolean> => {
    const msg = HITL_MESSAGES.changeTemplate(templateName);
    const response = await requestConfirmation(msg.type, msg.title, msg.description);
    return response === "confirmed";
  }, [requestConfirmation]);

  /**
   * Import data with confirmation.
   */
  const confirmImport = useCallback(async (): Promise<boolean> => {
    const response = await requestConfirmation(
      HITL_MESSAGES.importData.type,
      HITL_MESSAGES.importData.title,
      HITL_MESSAGES.importData.description
    );
    return response === "confirmed";
  }, [requestConfirmation]);

  return {
    confirmClearAll,
    confirmReplaceSection,
    confirmDeleteWork,
    confirmDeleteEducation,
    confirmDeleteProject,
    confirmChangeTemplate,
    confirmImport,
  };
}

/**
 * Type for the return value of useHumanInTheLoop.
 */
export type HumanInTheLoop = ReturnType<typeof useHumanInTheLoop>;
