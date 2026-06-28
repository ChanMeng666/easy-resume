'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Save, Loader2 } from 'lucide-react';
import type { ResumeData } from '@/lib/validation/schema';

interface StructuredEditorProps {
  resume: ResumeData;
  onApply: (next: ResumeData) => void;
  onCancel: () => void;
  /** Persist the edit as a new version (free — no LLM/charge). Optional. */
  onSaveAsVersion?: (next: ResumeData) => void;
  /** True while a save-as-version request is in flight. */
  saving?: boolean;
}

/**
 * Direct, free editing of the parsed resume fields (name, title, summary,
 * skills, and work bullets). Applying re-renders the Typst + PDF on the client —
 * it never calls the AI pipeline, so it is FREE: no LLM, no credit. Only an LLM
 * re-tailor (Refine) is billable.
 *
 * Scope is intentionally the high-signal fields a user most often fixes; dates,
 * education, and projects stay as generated (edit via Refine if needed).
 */
export function StructuredEditor({ resume, onApply, onCancel, onSaveAsVersion, saving }: StructuredEditorProps) {
  // Deep-clone so edits stay local until Apply (structuredClone — not Date/random).
  const [draft, setDraft] = useState<ResumeData>(() => structuredClone(resume));

  /** Patch the basics block immutably. */
  const setBasics = (patch: Partial<ResumeData['basics']>) =>
    setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  /** Replace a skill category's keywords (parsed from a comma-separated string). */
  const setSkillKeywords = (index: number, value: string) =>
    setDraft((d) => {
      const skills = d.skills.map((s, i) =>
        i === index
          ? { ...s, keywords: value.split(',').map((k) => k.trim()).filter(Boolean) }
          : s
      );
      return { ...d, skills };
    });

  /** Replace a work entry's highlights (one bullet per line). */
  const setWorkHighlights = (index: number, value: string) =>
    setDraft((d) => {
      const work = d.work.map((w, i) =>
        i === index
          ? { ...w, highlights: value.split('\n').map((h) => h.trim()).filter(Boolean) }
          : w
      );
      return { ...d, work };
    });

  return (
    <div className="rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="proof-label mb-1">§ edit-fields</p>
          <h3 className="text-base sm:text-lg font-black">Edit resume fields</h3>
        </div>
        <span className="rounded-lg border-2 border-black bg-green-100 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
          Free · no credit
        </span>
      </div>

      <div className="space-y-5">
        {/* Basics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="se-name" className="proof-label !text-foreground">Name</Label>
            <Input
              id="se-name"
              value={draft.basics.name}
              onChange={(e) => setBasics({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-label" className="proof-label !text-foreground">Professional title</Label>
            <Input
              id="se-label"
              value={draft.basics.label}
              onChange={(e) => setBasics({ label: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="se-summary" className="proof-label !text-foreground">Summary</Label>
          <Textarea
            id="se-summary"
            rows={3}
            value={draft.basics.summary ?? ''}
            onChange={(e) => setBasics({ summary: e.target.value })}
          />
        </div>

        {/* Skills */}
        {draft.skills.length > 0 && (
          <div className="space-y-2">
            <p className="proof-label !text-foreground">Skills (comma-separated)</p>
            {draft.skills.map((skill, i) => (
              <div key={`${skill.name}-${i}`} className="space-y-1.5">
                <Label htmlFor={`se-skill-${i}`} className="text-xs font-bold">{skill.name}</Label>
                <Input
                  id={`se-skill-${i}`}
                  value={skill.keywords.join(', ')}
                  onChange={(e) => setSkillKeywords(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Work highlights */}
        {draft.work.length > 0 && (
          <div className="space-y-2">
            <p className="proof-label !text-foreground">Experience bullets (one per line)</p>
            {draft.work.map((job, i) => (
              <div key={`${job.company}-${i}`} className="space-y-1.5">
                <Label htmlFor={`se-work-${i}`} className="text-xs font-bold">
                  {job.position} · {job.company}
                </Label>
                <Textarea
                  id={`se-work-${i}`}
                  rows={Math.min(Math.max(job.highlights.length, 2), 8)}
                  value={job.highlights.join('\n')}
                  onChange={(e) => setWorkHighlights(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => onApply(draft)}
          className="border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
        >
          <Check className="mr-2 h-4 w-4" />
          Apply changes
        </Button>
        {onSaveAsVersion && (
          <Button
            variant="outline"
            onClick={() => onSaveAsVersion(draft)}
            disabled={saving}
            className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
            title="Save these edits as a new version — free, no AI"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save as new version
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
