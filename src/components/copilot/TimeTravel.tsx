"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Redo2, History, Clock, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Version entry for the history list.
 */
interface VersionEntry {
  id: string;
  timestamp: string;
  description: string;
  changedBy: "user" | "ai" | "system";
}

/**
 * Props for TimeTravelControls component.
 */
interface TimeTravelControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  historyInfo: {
    current: number;
    total: number;
  };
  onShowHistory: () => void;
}

/**
 * Time Travel Controls - Undo/Redo buttons with history access.
 * Provides quick access to undo/redo and full history view.
 */
export function TimeTravelControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyInfo,
  onShowHistory,
}: TimeTravelControlsProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        className="gap-1"
      >
        <Undo2 className="w-4 h-4" />
        Undo
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        className="gap-1"
      >
        <Redo2 className="w-4 h-4" />
        Redo
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="outline"
        size="sm"
        onClick={onShowHistory}
        className="gap-1"
      >
        <History className="w-4 h-4" />
        History
        {historyInfo.total > 0 && (
          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-md border">
            {historyInfo.current}/{historyInfo.total}
          </span>
        )}
      </Button>
    </div>
  );
}

/**
 * Props for HistoryDialog component.
 */
interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: VersionEntry[];
  currentVersion: number;
  onRestoreVersion: (versionId: string) => void;
}

/**
 * History Dialog - Shows full version history with restore option.
 */
export function HistoryDialog({
  open,
  onOpenChange,
  versions,
  currentVersion,
  onRestoreVersion,
}: HistoryDialogProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) return "Just now";
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} min${mins > 1 ? "s" : ""} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    
    // Show date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChangedByLabel = (changedBy: "user" | "ai" | "system") => {
    switch (changedBy) {
      case "user":
        return { label: "You", color: "bg-blue-100 text-blue-700" };
      case "ai":
        return { label: "AI", color: "bg-purple-100 text-purple-700" };
      case "system":
        return { label: "System", color: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            Browse and restore previous versions of your resume.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No history yet</p>
              <p className="text-sm">Changes will appear here as you edit</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, index) => {
                const isCurrent = index === currentVersion - 1;
                const { label, color } = getChangedByLabel(version.changedBy);

                return (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isCurrent
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                    }`}
                    onClick={() => !isCurrent && onRestoreVersion(version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(version.timestamp)}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{version.description}</p>
                      </div>
                      {!isCurrent && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Props for ConversationReplay component.
 */
interface ConversationReplayProps {
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }[];
  onReplayFrom: (messageId: string) => void;
}

/**
 * Conversation Replay - Shows conversation history with replay option.
 */
export function ConversationReplay({
  messages,
  onReplayFrom,
}: ConversationReplayProps) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  return (
    <div className="p-4 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
      <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Conversation Timeline
      </h4>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-2 rounded-lg border cursor-pointer transition-all ${
              selectedMessage === message.id
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setSelectedMessage(message.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                message.role === "user"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-purple-100 text-purple-700"
              }`}>
                {message.role === "user" ? "You" : "AI"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs line-clamp-2">{message.content}</p>

            {selectedMessage === message.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 pt-2 border-t"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReplayFrom(message.id);
                  }}
                  className="w-full text-xs"
                >
                  Replay from here
                </Button>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline undo notification that appears after an action.
 */
export function UndoNotification({
  message,
  onUndo,
  autoHideMs = 5000,
}: {
  message: string;
  onUndo: () => void;
  autoHideMs?: number;
}) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after timeout
  useState(() => {
    const timer = setTimeout(() => setIsVisible(false), autoHideMs);
    return () => clearTimeout(timer);
  });

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
          <span className="text-sm font-medium">{message}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={onUndo}
            className="bg-transparent border-white text-white hover:bg-white/20"
          >
            Undo
          </Button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
