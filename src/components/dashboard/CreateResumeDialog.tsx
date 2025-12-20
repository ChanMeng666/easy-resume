"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Edit3 } from "lucide-react";
import { getDefaultResumeData } from "@/lib/defaults/resumeData";

interface CreateResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const templates = [
  { id: "two-column", name: "Two Column", description: "Professional layout" },
  { id: "classic", name: "Classic", description: "Traditional style" },
  { id: "modern", name: "Modern", description: "Clean and minimal" },
];

const editorModes = [
  {
    id: "ai",
    name: "AI Editor",
    description: "Chat with AI to build your resume",
    icon: Sparkles,
    color: "bg-purple-500",
    recommended: true,
  },
  {
    id: "manual",
    name: "Manual Editor",
    description: "Traditional form-based editing",
    icon: Edit3,
    color: "bg-gray-500",
    recommended: false,
  },
];

/**
 * Neobrutalism styled dialog for creating a new resume.
 */
export function CreateResumeDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateResumeDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("My Resume");
  const [selectedTemplate, setSelectedTemplate] = useState("two-column");
  const [selectedMode, setSelectedMode] = useState("ai");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "My Resume",
          templateId: selectedTemplate,
          data: getDefaultResumeData(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create resume");
      }

      const resume = await response.json();
      onOpenChange(false);
      onCreated?.();

      // Navigate to the appropriate editor based on selection
      const editorPath = selectedMode === "ai" ? "/editor" : "/editor/manual";
      router.push(`${editorPath}?id=${resume.id}&template=${selectedTemplate}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create resume");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Resume</DialogTitle>
          <DialogDescription>
            Choose how you want to create your resume.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Editor Mode Selection */}
          <div className="space-y-2">
            <Label>Editor Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              {editorModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`p-4 rounded-lg border-2 border-black text-left transition-all relative ${
                    selectedMode === mode.id
                      ? `${mode.color} text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]`
                      : "bg-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  }`}
                >
                  {mode.recommended && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-black rounded-md border border-black">
                      Recommended
                    </span>
                  )}
                  <mode.icon className={`h-5 w-5 mb-2 ${selectedMode === mode.id ? "text-white" : "text-gray-600"}`} />
                  <p className="font-bold text-sm">{mode.name}</p>
                  <p className={`text-xs ${selectedMode === mode.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Resume Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Resume Title</Label>
            <Input
              id="title"
              placeholder="My Resume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-3 rounded-lg border-2 border-black text-left transition-all ${
                    selectedTemplate === template.id
                      ? "bg-primary text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]"
                      : "bg-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  }`}
                >
                  <p className="font-bold text-sm">{template.name}</p>
                  <p className={`text-xs ${selectedTemplate === template.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border-2 border-black">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-1">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {selectedMode === "ai" && <Sparkles className="h-4 w-4" />}
                Create Resume
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
