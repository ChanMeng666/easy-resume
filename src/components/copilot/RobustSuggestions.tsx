"use client";

import { RenderSuggestionsListProps } from "@copilotkit/react-ui";
import { STATIC_SUGGESTIONS } from "@/lib/copilot/suggestions";

/**
 * Robust suggestions component that shows static fallback when dynamic suggestions fail.
 * This ensures suggestions are always visible even during rate limit errors.
 */
export function RobustSuggestions({
  suggestions,
  onSuggestionClick,
  isLoading,
}: RenderSuggestionsListProps) {
  // Use dynamic suggestions if available, otherwise fall back to static
  const displaySuggestions =
    suggestions && suggestions.length > 0 ? suggestions : STATIC_SUGGESTIONS;

  // Don't show anything if loading (will show loading indicator)
  if (isLoading && (!suggestions || suggestions.length === 0)) {
    return (
      <div className="copilotKitSuggestions flex flex-wrap gap-2 p-2 justify-center">
        {STATIC_SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.message)}
            className="copilotKitSuggestion px-3 py-1.5 text-sm rounded-lg bg-gray-100 
                       hover:bg-gray-200 border border-gray-200 transition-colors 
                       cursor-pointer text-left opacity-70"
          >
            {suggestion.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="copilotKitSuggestions flex flex-wrap gap-2 p-2 justify-center">
      {displaySuggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion.message)}
          className={`copilotKitSuggestion px-3 py-1.5 text-sm rounded-lg 
                     border transition-colors cursor-pointer text-left
                     ${suggestion.isLoading 
                       ? "bg-gray-50 border-gray-200 animate-pulse" 
                       : "bg-gray-100 hover:bg-gray-200 border-gray-200"}`}
        >
          {suggestion.title}
        </button>
      ))}
    </div>
  );
}

