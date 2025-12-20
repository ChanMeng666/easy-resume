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
import { Loader2 } from "lucide-react";
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

      // Navigate to editor with the new resume
      router.push(`/editor?id=${resume.id}`);
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
            Give your resume a name and choose a template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Resume"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
