"use client";

import { RenderSuggestionsListProps } from "@copilotkit/react-ui";
import { STATIC_SUGGESTIONS } from "@/lib/copilot/suggestions";

/**
 * Compact suggestions component using only static suggestions.
 * No dynamic AI generation to avoid rate limits and reduce token usage.
 */
export function RobustSuggestions({
  onSuggestionClick,
}: RenderSuggestionsListProps) {
  return (
    <div className="copilotKitSuggestions flex flex-wrap gap-1.5 p-2 justify-center">
      {STATIC_SUGGESTIONS.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion.message)}
          className="copilotKitSuggestion"
        >
          {suggestion.title}
        </button>
      ))}
    </div>
  );
}
