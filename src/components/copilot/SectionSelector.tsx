"use client";

import { motion } from "framer-motion";
import { EditSection, SECTIONS, getSectionInfo } from "@/lib/copilot/sections";

interface SectionSelectorProps {
  activeSection: EditSection;
  onSectionChange: (section: EditSection) => void;
}

/**
 * Section selector component for focused AI editing.
 * Allows users to select which part of their resume to edit.
 * Uses Neobrutalism styling with compact horizontal layout.
 */
export function SectionSelector({
  activeSection,
  onSectionChange,
}: SectionSelectorProps) {
  return (
    <div className="w-full">
      {/* Section tabs - horizontal scrollable on mobile */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <motion.button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg
                border-2 border-black font-bold text-sm
                transition-all duration-150
                ${isActive 
                  ? "bg-purple-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]" 
                  : "bg-white text-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-base">{section.icon}</span>
              <span className="hidden sm:inline">{section.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Active section info */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-sm text-muted-foreground"
      >
        <span className="font-bold text-gray-900">
          {getSectionInfo(activeSection).icon} {getSectionInfo(activeSection).label}
        </span>
        <span className="mx-2">—</span>
        <span>{getSectionInfo(activeSection).description}</span>
        <span className="ml-2 text-xs text-purple-600">
          ({getSectionInfo(activeSection).toolCount} AI tools)
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Compact inline section indicator for the chat header.
 */
export function SectionIndicator({ section }: { section: EditSection }) {
  const info = getSectionInfo(section);
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-md text-xs font-bold text-purple-700">
      <span>{info.icon}</span>
      <span>Editing: {info.label}</span>
    </div>
  );
}

