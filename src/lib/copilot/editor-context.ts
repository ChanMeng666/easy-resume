"use client";

import { createContext, useContext } from "react";

/**
 * Context for sharing scroll direction within the editor page.
 * This is needed because the scroll happens in a flex container, not the window.
 */
export const ScrollDirectionContext = createContext<'up' | 'down' | null>(null);

/**
 * Hook to access scroll direction from the editor's scroll container.
 */
export function useEditorScrollDirection() {
  return useContext(ScrollDirectionContext);
}

