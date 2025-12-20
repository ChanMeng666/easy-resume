"use client";

import { useState, useEffect, useCallback } from "react";

const THREAD_STORAGE_KEY = "vitex-resume-thread";
const THREAD_HISTORY_KEY = "vitex-thread-history";

/**
 * Thread metadata stored in localStorage.
 */
interface ThreadMetadata {
  threadId: string;
  resumeId?: string;
  title: string;
  createdAt: string;
  lastAccessedAt: string;
}

/**
 * Custom hook for managing CopilotKit thread persistence.
 * Allows users to resume conversations across sessions.
 */
export function useThreadPersistence() {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved thread ID on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THREAD_STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved) as ThreadMetadata;
          setCurrentThreadId(data.threadId);
        } catch {
          // Invalid data, clear it
          localStorage.removeItem(THREAD_STORAGE_KEY);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  /**
   * Get the saved thread ID.
   */
  const getSavedThreadId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(THREAD_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as ThreadMetadata;
        return data.threadId;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  /**
   * Add thread to history.
   */
  const addToHistory = useCallback((metadata: ThreadMetadata) => {
    if (typeof window === "undefined") return;
    
    const historyStr = localStorage.getItem(THREAD_HISTORY_KEY);
    let history: ThreadMetadata[] = [];
    
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch {
        history = [];
      }
    }

    // Remove duplicate if exists
    history = history.filter((h) => h.threadId !== metadata.threadId);
    
    // Add to front
    history.unshift(metadata);
    
    // Keep only last 10 threads
    history = history.slice(0, 10);
    
    localStorage.setItem(THREAD_HISTORY_KEY, JSON.stringify(history));
  }, []);

  /**
   * Save thread ID to localStorage.
   */
  const saveThreadId = useCallback((threadId: string, resumeId?: string, title?: string) => {
    if (typeof window === "undefined") return;

    const metadata: ThreadMetadata = {
      threadId,
      resumeId,
      title: title || "Resume Conversation",
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(metadata));
    setCurrentThreadId(threadId);

    // Also add to history
    addToHistory(metadata);
  }, [addToHistory]);

  /**
   * Update last accessed time.
   */
  const updateLastAccessed = useCallback(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(THREAD_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as ThreadMetadata;
        data.lastAccessedAt = new Date().toISOString();
        localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore errors
      }
    }
  }, []);

  /**
   * Clear current thread (start fresh).
   */
  const clearThread = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(THREAD_STORAGE_KEY);
    setCurrentThreadId(null);
  }, []);

  /**
   * Get thread metadata.
   */
  const getThreadMetadata = useCallback((): ThreadMetadata | null => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(THREAD_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as ThreadMetadata;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  /**
   * Get thread history.
   */
  const getThreadHistory = useCallback((): ThreadMetadata[] => {
    if (typeof window === "undefined") return [];
    const historyStr = localStorage.getItem(THREAD_HISTORY_KEY);
    if (historyStr) {
      try {
        return JSON.parse(historyStr);
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  /**
   * Switch to a thread from history.
   */
  const switchToThread = useCallback((threadId: string) => {
    const history = getThreadHistory();
    const thread = history.find((h) => h.threadId === threadId);
    if (thread) {
      thread.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(thread));
      setCurrentThreadId(threadId);
      addToHistory(thread);
    }
  }, [getThreadHistory, addToHistory]);

  /**
   * Delete a thread from history.
   */
  const deleteFromHistory = useCallback((threadId: string) => {
    if (typeof window === "undefined") return;
    
    const history = getThreadHistory().filter((h) => h.threadId !== threadId);
    localStorage.setItem(THREAD_HISTORY_KEY, JSON.stringify(history));
    
    // If deleting current thread, clear it
    if (currentThreadId === threadId) {
      clearThread();
    }
  }, [getThreadHistory, currentThreadId, clearThread]);

  return {
    currentThreadId,
    isLoaded,
    getSavedThreadId,
    saveThreadId,
    updateLastAccessed,
    clearThread,
    getThreadMetadata,
    getThreadHistory,
    switchToThread,
    deleteFromHistory,
  };
}

/**
 * Type for the return value of useThreadPersistence.
 */
export type ThreadPersistence = ReturnType<typeof useThreadPersistence>;
