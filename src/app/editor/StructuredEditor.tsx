'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
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
    <div className="rounded-3xl border border-ash bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium tracking-tight text-aubergine">Edit resume fields</h3>
        <Badge variant="success">Free · no credit</Badge>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="space-y-4 border-b border-ash pb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="se-name">Name</Label>
              <Input
                id="se-name"
                value={draft.basics.name}
                onChange={(e) => setBasics({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="se-label">Professional title</Label>
              <Input
                id="se-label"
                value={draft.basics.label}
                onChange={(e) => setBasics({ label: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="se-summary">Summary</Label>
            <Textarea
              id="se-summary"
              rows={3}
              value={draft.basics.summary ?? ''}
              onChange={(e) => setBasics({ summary: e.target.value })}
            />
          </div>
        </div>

        {/* Skills */}
        {draft.skills.length > 0 && (
          <div className="space-y-3 border-b border-ash pb-6">
            <p className="text-sm font-medium text-muted-foreground">Skills (comma-separated)</p>
            {draft.skills.map((skill, i) => (
              <div key={`${skill.name}-${i}`} className="space-y-1.5">
                <Label htmlFor={`se-skill-${i}`} className="text-xs">{skill.name}</Label>
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Experience bullets (one per line)</p>
            {draft.work.map((job, i) => (
              <div key={`${job.company}-${i}`} className="space-y-1.5">
                <Label htmlFor={`se-work-${i}`} className="text-xs">
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

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => onApply(draft)}>Apply changes</Button>
        {onSaveAsVersion && (
          <Button
            variant="outline"
            onClick={() => onSaveAsVersion(draft)}
            disabled={saving}
            title="Save these edits as a new version — free, no AI"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as new version
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
