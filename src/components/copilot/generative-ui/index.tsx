"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle, Briefcase, GraduationCap, Code, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Tool execution status indicator.
 */
export function ToolProgressCard({
  title,
  status,
  preview,
}: {
  title: string;
  status: "executing" | "complete" | "error";
  preview?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-center gap-3 mb-3">
        {status === "executing" && (
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
        )}
        {status === "complete" && (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
        {status === "error" && (
          <AlertCircle className="w-5 h-5 text-red-600" />
        )}
        <span className="font-bold text-sm">{title}</span>
      </div>
      {preview && <div className="mt-2">{preview}</div>}
    </motion.div>
  );
}

/**
 * Work experience entry card for chat display.
 */
export function WorkEntryCard({
  company,
  position,
  dates,
  location,
  highlights,
  isNew = false,
}: {
  company: string;
  position: string;
  dates: string;
  location?: string;
  highlights: string[];
  isNew?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg border border-black">
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h4 className="font-bold text-sm">{position}</h4>
            <p className="text-xs text-muted-foreground">{company}</p>
          </div>
        </div>
        {isNew && (
          <Badge variant="default" className="text-[10px]">New</Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {dates} {location && `• ${location}`}
      </div>
      {highlights.length > 0 && (
        <ul className="text-xs space-y-1">
          {highlights.slice(0, 3).map((h, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-purple-600">•</span>
              <span>{h}</span>
            </li>
          ))}
          {highlights.length > 3 && (
            <li className="text-muted-foreground">+{highlights.length - 3} more...</li>
          )}
        </ul>
      )}
    </motion.div>
  );
}

/**
 * Education entry card for chat display.
 */
export function EducationCard({
  institution,
  degree,
  area,
  dates,
  gpa,
}: {
  institution: string;
  degree: string;
  area: string;
  dates: string;
  gpa?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="p-2 bg-cyan-100 rounded-lg border border-black">
          <GraduationCap className="w-4 h-4 text-cyan-600" />
        </div>
        <div>
          <h4 className="font-bold text-sm">{degree} in {area}</h4>
          <p className="text-xs text-muted-foreground">{institution}</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {dates} {gpa && `• GPA: ${gpa}`}
      </div>
    </motion.div>
  );
}

/**
 * Project card for chat display.
 */
export function ProjectCard({
  name,
  description,
  highlights,
  url,
}: {
  name: string;
  description: string;
  highlights: string[];
  url?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="p-2 bg-green-100 rounded-lg border border-black">
          <Code className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <h4 className="font-bold text-sm">{name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
      {highlights.length > 0 && (
        <ul className="text-xs space-y-1 mt-2">
          {highlights.slice(0, 2).map((h, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-green-600">•</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline mt-2 block">
          View Project →
        </a>
      )}
    </motion.div>
  );
}

/**
 * Skills tag cloud for chat display.
 */
export function SkillsTagCloud({
  category,
  skills,
}: {
  category: string;
  skills: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <h4 className="font-bold text-sm mb-2">{category}</h4>
      <div className="flex flex-wrap gap-1">
        {skills.map((skill, i) => (
          <span
            key={i}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded border border-black"
          >
            {skill}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * ATS Score display card.
 */
export function ATSScoreCard({
  score,
  keywords,
  suggestions,
}: {
  score: number;
  keywords: string[];
  suggestions: string[];
}) {
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  const barColor = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm">ATS Compatibility</h4>
        <span className={`text-2xl font-black ${scoreColor}`}>{score}/100</span>
      </div>
      
      {/* Score Bar */}
      <div className="h-2 bg-gray-200 rounded-full mb-4 border border-black overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full ${barColor}`}
        />
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold mb-1">✓ Keywords Found:</p>
          <div className="flex flex-wrap gap-1">
            {keywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded border border-green-300">
                {kw}
              </span>
            ))}
            {keywords.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{keywords.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-1">💡 Suggestions:</p>
          <ul className="text-xs space-y-1">
            {suggestions.slice(0, 3).map((s, i) => (
              <li key={i} className="text-muted-foreground">{s}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Multi-agent status display.
 */
export function AgentStatusDisplay({
  agents,
}: {
  agents: {
    name: string;
    status: "idle" | "running" | "completed" | "error";
    progress?: number;
  }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <h4 className="font-bold text-sm">Multi-Agent Analysis</h4>
      </div>
      <div className="space-y-2">
        {agents.map((agent, i) => (
          <div key={i} className="flex items-center gap-2">
            {agent.status === "running" && (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            )}
            {agent.status === "completed" && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            {agent.status === "idle" && (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            {agent.status === "error" && (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs font-medium flex-1">{agent.name}</span>
            {agent.status === "running" && agent.progress !== undefined && (
              <span className="text-xs text-muted-foreground">{agent.progress}%</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * HITL Confirmation dialog for destructive operations.
 */
export function ConfirmationDialog({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg border border-black">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h4 className="font-bold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
          Confirm
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Section comparison view for before/after changes.
 */
export function ContentDiffView({
  section,
  before,
  after,
  onApprove,
  onReject,
}: {
  section: string;
  before: string;
  after: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl bg-white"
    >
      <h4 className="font-bold text-sm mb-3">Changes to {section}</h4>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold text-red-600 mb-1">BEFORE</p>
          <div className="p-2 bg-red-50 rounded border border-red-200 text-xs">
            {before || <span className="text-muted-foreground italic">Empty</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-green-600 mb-1">AFTER</p>
          <div className="p-2 bg-green-50 rounded border border-green-200 text-xs">
            {after || <span className="text-muted-foreground italic">Empty</span>}
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onReject}>
          Reject
        </Button>
        <Button size="sm" onClick={onApprove}>
          Approve
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Template recommendation mini preview.
 */
export function TemplatePreviewMini({
  templateName,
  reason,
  onSelect,
}: {
  templateName: string;
  reason?: string;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-16 bg-gray-100 rounded border border-black flex items-center justify-center">
          <span className="text-[8px] font-bold text-muted-foreground">PDF</span>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{templateName}</h4>
          {reason && (
            <p className="text-xs text-muted-foreground line-clamp-2">{reason}</p>
          )}
        </div>
        <Badge variant="outline" className="text-[10px]">
          Select
        </Badge>
      </div>
    </motion.div>
  );
}

/**
 * Generation progress with streaming sections.
 */
export function StreamingProgress({
  sections,
}: {
  sections: { name: string; status: "pending" | "generating" | "complete" }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white"
    >
      <h4 className="font-bold text-sm mb-3">Generating Resume...</h4>
      <div className="space-y-2">
        <AnimatePresence>
          {sections.map((section, i) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2"
            >
              {section.status === "complete" && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              {section.status === "generating" && (
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              )}
              {section.status === "pending" && (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              )}
              <span className={`text-xs ${section.status === "pending" ? "text-muted-foreground" : "font-medium"}`}>
                {section.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
