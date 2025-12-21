"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, Sparkles } from "lucide-react";

/**
 * Props for StreamingResumeBuilder component.
 */
interface StreamingResumeBuilderProps {
  isGenerating: boolean;
  currentSection: string | null;
  generatedSections: string[];
}

/**
 * Progressive resume builder that shows sections as they are generated.
 * Provides real-time visual feedback during AI generation.
 */
export function StreamingResumeBuilder({
  isGenerating,
  currentSection,
  generatedSections,
}: StreamingResumeBuilderProps) {
  const allSections = [
    { id: "basics", name: "Basic Info" },
    { id: "summary", name: "Professional Summary" },
    { id: "work", name: "Work Experience" },
    { id: "education", name: "Education" },
    { id: "skills", name: "Skills" },
    { id: "projects", name: "Projects" },
  ];

  const getSectionStatus = (sectionId: string): "pending" | "generating" | "complete" => {
    if (generatedSections.includes(sectionId)) return "complete";
    if (currentSection === sectionId) return "generating";
    return "pending";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-sm">
          {isGenerating ? "Building Your Resume..." : "Resume Generation"}
        </h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {allSections.map((section, index) => {
            const status = getSectionStatus(section.id);
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  status === "generating"
                    ? "border-purple-500 bg-purple-50"
                    : status === "complete"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Status Icon */}
                {status === "complete" && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {status === "generating" && (
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                )}
                {status === "pending" && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}

                {/* Section Name */}
                <span className={`text-sm flex-1 ${
                  status === "pending" ? "text-muted-foreground" : "font-medium"
                }`}>
                  {section.name}
                </span>

                {/* Status Badge */}
                {status === "generating" && (
                  <span className="text-xs text-purple-600 font-medium animate-pulse">
                    Generating...
                  </span>
                )}
                {status === "complete" && (
                  <span className="text-xs text-green-600 font-medium">
                    Done
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Typing Indicator */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2"
        >
          <div className="flex gap-1">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-purple-600 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 bg-purple-600 rounded-full"
            />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 bg-purple-600 rounded-full"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            AI is working on your resume...
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Streaming text component that shows text appearing word by word.
 */
export function StreamingText({
  text,
  speed = 30,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    let index = 0;
    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-purple-600 ml-0.5"
        />
      )}
    </span>
  );
}

/**
 * Progressive section reveal component.
 */
export function ProgressiveSectionReveal({
  sections,
  revealDelay = 300,
}: {
  sections: { id: string; title: string; content: React.ReactNode }[];
  revealDelay?: number;
}) {
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  useEffect(() => {
    sections.forEach((section, index) => {
      setTimeout(() => {
        setVisibleSections((prev) => [...prev, section.id]);
      }, index * revealDelay);
    });
  }, [sections, revealDelay]);

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {sections.map((section) => (
          visibleSections.includes(section.id) && (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="p-4 rounded-xl bg-white"
            >
              <h4 className="font-bold text-sm mb-2">{section.title}</h4>
              {section.content}
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Live typing indicator for chat messages.
 */
export function TypingIndicator({
  message = "Thinking",
}: {
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 border-2 border-black w-fit"
    >
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
      <span className="text-xs text-muted-foreground">{message}...</span>
    </motion.div>
  );
}
